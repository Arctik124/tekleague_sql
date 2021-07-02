const express = require('express');
const userRouter = require('./routes/user.routes')
const battleRouter = require('./routes/battle.routes')

require("dotenv/config")


const app = express();
app.use(express.static(__dirname));
app.use(express.json());


//Rooutes

app.use('/api/user', userRouter)
app.use('/api/battle', battleRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));