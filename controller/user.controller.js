const Joi = require('joi');
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const schemaCrete = Joi.object({
    name: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required(),
    password: Joi.string()
        .min(8)
        .max(30)
        .required(),
    password2: Joi.ref('password'),
    email: Joi.string()
        .email({ minDomainSegments: 2 })
        .required(),
    steam_profile: Joi.string()
        .max(100)
        .allow(''),
    main_char: Joi.string()
        .max(30),
    description: Joi.string()
        .max(1000)
        .allow('')
})

const schemaUpdate = Joi.object({
    name: Joi.string()
        .alphanum()
        .min(3)
        .max(30),
    password: Joi.string()
        .min(8)
        .max(30)
        .allow(''),
    password2: Joi.ref('password'),
    steam_profile: Joi.string()
        .max(100)
        .allow(''),
    main_char: Joi.string()
        .max(30),
    description: Joi.string()
        .max(1000)
        .allow('')
})

class UserController {

    async createUser(req, res) {
        const { name, email, main_char, steam_profile, description, password, password2 } = req.body;

        const value = schemaCrete.validate({ name, email, main_char, steam_profile, description, password, password2 });

        if (typeof value.error == 'undefined') {

            const existingUser = await db.query('select exists(select * from Users where lowercase_name=$1 or email=$2)', [name.toLowerCase().trim(), email.trim()])

            if (!existingUser.rows[0].exists) {
                const hashedPass = await bcrypt.hash(password.trim(), 10);
                const newUser = await db
                    .query('INSERT INTO users ( name, lowercase_name, email, password, main_char, steam_profile, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name.trim(), name.trim().toLowerCase(), email.trim(), hashedPass, main_char.trim(), steam_profile.trim(), description.trim()])
                res.json(newUser);
            } else {
                res.json({
                    error: "Username or email already exists"
                })
            }

        } else {
            res.json(value.error.details[0].message);

        }

    }

    async loginUser(req, res) {
        const { name, password } = req.body;
        const user = await db.query('select name, password, userid from users where name = $1', [name.trim()]);

        if (user.rows[0].name) {
            bcrypt.compare(password, user.rows[0].password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch)
                    jwt.sign({
                        user: {
                            name: user.rows[0].name,
                            userid: user.rows[0].userid
                        }
                    }, process.env.JWT_SECRET_KEY, (err, token) => {
                        if (err)
                            throw err;
                        else
                            return res.json({ token });
                    })
                else return res.json({ message: "Password incorrect" });
            })
        } else {
            res.json({ error: "No such user" });
            return;
        }

    }

    async getUsers(req, res) {
        jwt.verify(req.token, process.env.JWT_SECRET_KEY, async(err, auth_data) => {
            if (err)
                res.sendStatus(403)
            else {
                const users = await db.query('SELECT * FROM Users')
                res.json({
                    users: users.rows,
                    auth_data
                })
            }
        })
    }
    async getOneUser(req, res) {
        const id = req.params.id;
        const users = await db.query('SELECT * FROM Users WHERE UserID=$1', [id])
        res.json(users.rows)
    }
    async updateUser(req, res) {
        const id = req.params.id;
        const { name, main_char, steam_profile, description, password, password2 } = req.body;

        const value = schemaUpdate.validate({ name, main_char, steam_profile, description, password, password2 });
        console.log(name, main_char, steam_profile, description, password, password2)


        if (typeof value.error == 'undefined') {

            const existingUser = await db.query('select exists(select * from Users where lowercase_name=$1)', [name.toLowerCase().trim()])

            if (!existingUser.rows[0].exists) {
                if (typeof password != 'undefined') {
                    value.value.password = await bcrypt.hash(password.trim(), 10);
                }
                delete value.value.password2;

                let query = ['UPDATE Users'];
                let variables = [];
                query.push('SET');

                var set = [];

                Object.keys(value.value).forEach(function(key) {
                    if (typeof value.value[key] != 'undefined') {
                        variables.push(value.value[key]);
                        set.push(key + ' = ($' + (variables.length) + ')');
                    }
                });
                query.push(set.join(', '));

                query.push('WHERE UserID = ' + id);
                query.push('RETURNING *');

                query = query.join(' ');

                console.log(query)
                console.log(variables)

                const updatedUser = await db.query(query, variables);

                res.json(updatedUser.rows[0]);

            } else {
                res.json({
                    error: "Username or email already exists"
                })
            }

        } else {
            res.json(value.error.details[0].message);

        }
    }
    async deleteUser(req, res) {
        const id = req.params.id;
        const users = await db.query('DELETE FROM Users WHERE UserID=$1', [id])
        res.json(users.rows)
    }
}

module.exports = new UserController()