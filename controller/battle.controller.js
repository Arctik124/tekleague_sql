const Joi = require('joi');
const db = require('../db');
const bcrypt = require('bcryptjs');

class BattleController {

    async createBattle(req, res) {
        var { player1, player2, max_score } = req.body;
        let errors = [];

        if (player1 === player2) errors.push({ msg: "Player1 and player2 are identical" });

        const existingUser1 = await db.query('select exists(select * from Users where UserID=$1)', [player1])
        const existingUser2 = await db.query('select exists(select * from Users where UserID=$1)', [player2])

        if (!existingUser1.rows[0].exists) errors.push({ msg: "Player1 does not exist" });
        if (!existingUser2.rows[0].exists) errors.push({ msg: "Player2 does not exist" });

        if (max_score < 3) errors.push({ msg: "Minimum set is first to 3" });

        if (max_score > 10) errors.push({ msg: "Maximum set is first to 10" });

        if (errors.length > 0) {
            res.json(errors);

        } else {

            const newBattle = await db.query('INSERT INTO Battle ( player1, player2, max_score) VALUES ($1, $2, $3) RETURNING *', [player1, player2, max_score]);

            const updatedUsers = await db.query('UPDATE Users SET total = total + 1 WHERE UserID = $1 or UserID = $2;', [player1, player2])
            res.json(newBattle.rows)
        }

    }
    async getBattlesByUser(req, res) {
        const id = req.query.playerID;
        const users = await db.query('SELECT * FROM Battle WHERE player1=$1 OR player2=$1', [id])
        res.json(users.rows)
    }
    async getOneBattle(req, res) {
        const id = req.params.id;
        const battle = await db.query('SELECT * FROM Battle WHERE BattleID=$1', [id])
        res.json(battle.rows)
    }
    async acceptBattle(req, res) {
        const accept = req.body.accept;
        const battleid = req.params.id;
        const active = await db.query('SELECT active FROM battle WHERE BattleID = $1', [battleid]);
        if (typeof active.rows[0].active === 'undefined' || !active.rows[0].active)
            res.json({ error: 'Battle is inactive' })
        else {

            if (accept === 'true') {
                const player2id = await db
                    .query('SELECT player2 FROM battle WHERE BattleId = $1', [battleid]);
                const updatedBattle = await db
                    .query("UPDATE Battle SET accepted = true WHERE BattleId = $1 RETURNING *;", [battleid]);
                const updatedPlayer1 = await db
                    .query("UPDATE Users SET declined_streak = 0 WHERE UserId = $1;", [player2id.rows[0].player2]);

                res.json(updatedBattle.rows[0])
            } else {
                const playerIDs = await db
                    .query('SELECT player1, player2 FROM battle WHERE BattleId = $1', [battleid]);
                const updatedBattle = await db
                    .query("UPDATE Battle SET active = false WHERE BattleId = $1 RETURNING *;", [battleid]);
                await db
                    .query("UPDATE Users SET declined = declined + 1, declined_streak = declined_streak + 1, total = total - 1 WHERE UserId = $1;", [playerIDs.rows[0].player2]);

                await db
                    .query("UPDATE Users SET total = total - 1 WHERE UserId = $1", [playerIDs.rows[0].player1]);

                const player2DecStreak = await db
                    .query('SELECT declined_streak FROM Users WHERE UserID = $1', [playerIDs.rows[0].player2])

                if (player2DecStreak.rows[0].declined_streak >= 3) {
                    await db
                        .query("UPDATE Users SET declined_streak = 0, mmr = mmr - 20 WHERE UserID = $1", [playerIDs.rows[0].player2])
                }

                res.json(updatedBattle.rows[0])
            }

        }


    }

    async updateScore(req, res) {
        const score1 = parseInt(req.body.score1);
        const score2 = parseInt(req.body.score2);
        const battleid = req.params.id;
        console.log(battleid)
        const userID = parseInt(req.body.UserID);
        let battle = await db.query('SELECT * FROM battle WHERE BattleID = $1', [battleid]);

        if (typeof battle.rows[0] === 'undefined') {
            res.json({ error: "No such BattleID" });
            return
        }

        battle = battle.rows[0];
        if (typeof battle.accepted === 'undefined' || !battle.accepted) {
            console.log(battle.accepted)
            res.json({ error: 'Battle is not accepted' })
            return
        }


        let player_to_confirm = ''
        if (userID === battle.player1)
            player_to_confirm = battle.player2
        else
            player_to_confirm = battle.player1

        console.log(player_to_confirm)
        console.log(userID === battle.player1)

        const max_score = parseInt(battle.max_score);

        const invalid = (score1 > max_score || score2 > max_score) ||
            (score1 === max_score && score2 === max_score) ||
            score1 < 0 || score2 < 0;

        const send_confirm = (score1 === max_score || score2 === max_score) && !invalid;

        if (invalid) {
            res.json({ error: 'Invalid score' });
            return
        }

        let query = ['UPDATE Battle SET score1 = $1, score2 = $2'];
        let variables = [score1, score2, battleid];

        if (send_confirm) {
            query.push(`, player_to_confirm = ${player_to_confirm}, confirmation_sent = true`)
        }

        query.push('WHERE BattleID = $3 RETURNING *');
        query = query.join(' ');

        const updatedBattle = await db.query(query, variables);

        res.json(updatedBattle.rows[0]);


    }

    async confirmScore(req, res) {
        const accept = req.body.accept;
        const battleid = req.params.id;
        let battle = await db.query('SELECT * FROM battle WHERE BattleID = $1', [battleid]);
        if (typeof battle.rows[0] === 'undefined') {
            res.json({ error: "No such BattleID" });
            return
        }
        battle = battle.rows[0];
        if (battle.active === false) {
            res.json({ error: 'Battle is already over' })
            return
        }
        if (typeof battle.accepted === 'undefined' || !battle.accepted) {
            res.json({ error: 'Battle is not accepted' })
            return
        } else {
            if (accept === 'true') {
                let query = ['UPDATE Battle SET']
                let queryp1 = ['UPDATE Users SET']
                let queryp2 = ['UPDATE Users SET']
                let variables = []
                let variablesp1 = []
                let variablesp2 = []

                query.push('score_confirmed = true, active = false')

                const delta = change_mmr(battle.score1, battle.score2);
                console.log(delta)
                query.push(`,winner = $1, delta = ${delta}`)

                if (battle.score1 > battle.score2) {
                    variables.push(battle.player1)
                    queryp1.push('won = won + 1')
                    queryp2.push('lost = lost + 1')
                } else {
                    variables.push(battle.player2)
                    queryp2.push('won = won + 1')
                    queryp1.push('lost = lost + 1')
                }

                queryp1.push(`, mmr = mmr + ${delta}`)
                queryp2.push(`, mmr = mmr - ${delta}`)

                query.push('WHERE BattleID = $2 RETURNING *');
                variables.push(battleid);
                queryp1.push('WHERE UserID = $1');
                variablesp1.push(battle.player1);
                queryp2.push('WHERE UserID = $1');
                variablesp2.push(battle.player2);

                query = query.join(' ');
                queryp1 = queryp1.join(' ');
                queryp2 = queryp2.join(' ');

                const updatedBattle = await db.query(query, variables);
                await db.query(queryp1, variablesp1);
                await db.query(queryp2, variablesp2);

                res.json(updatedBattle.rows[0]);

            } else {
                let query = ['UPDATE Battle SET confirmation_sent = false, player_to_confirm = null, score1 = 0, score2 = 0 WHERE BattleID = $1 RETURNING *'];
                const updatedBattle = await db.query(query.join(' '), [battleid]);
                res.json(updatedBattle.rows[0]);
            }
        }
    }

    async deleteBattle(req, res) {
        const id = req.params.id;
        const users = await db.query('DELETE FROM Battle WHERE BattleID=$1', [id])
        res.json(users.rows)
    }
}


function change_mmr(score1, score2) {

    // # typical win/lose k1
    const std_delta = 15
    var k1 = 1
    const winner = score1 - score2 > 0
    if (!winner) {
        k1 = -k1
    }

    // # ft length factor k3
    const ft_max = 10
    const ft_min = 3
    const ft_len = Math.max(score1, score2)
    const k3 = 1 + (ft_len - ft_min) / (ft_max - ft_min) / 10

    // # mmr difference factor k4
    const score_dif = Math.abs(score1 - score2)
    var k4 = 0
    if (score_dif > 2)
        k4 = 1 + score_dif / (ft_len * 4)
    else
        k4 = 1

    const delta = Math.round(std_delta * k1 * k4 * k3)

    return delta
}


module.exports = new BattleController()