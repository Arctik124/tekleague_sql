const db = require('./sqltest/db');
const mongoose = require('mongoose');
const User = require('./models/User')

require("dotenv/config")

//DB connect
mongoose.connect(
        process.env.DB_CONNECTION, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => { console.log('Connected to DB') })
    .catch((err) => { console.log(err) });


async function migrateUsers() {
    const users = await User.find({});

    users.forEach(async user => {
        let query = ['INSERT INTO Users '];
        query.push('( name, lowercase_name, email, password, main_char, steam_profile, description, total, won, lost, declined, declined_streak)')
        query.push('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 )');


        let variables = [user.name, user.lowercase_name, user.email, user.password, user.main_char, user.steam_profile, user.description,
            user.match_history.total, user.match_history.won, user.match_history.lost, user.match_history.declined, user.match_history.declined_streak
        ];

        await db.query(query.join(' '), variables)

        console.log(user.name)

    });

    const usersSQL = await db.query('select * from users')
    console.log(usersSQL.rows)

}

migrateUsers();