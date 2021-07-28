const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { verifyToken } = require('../config/auth');

router.get('/', verifyToken, userController.getUsers);
router.get('/:id', userController.getOneUser);
router.put('/:id', verifyToken, userController.updateUser);
router.delete('/:id', userController.deleteUser);

router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);



module.exports = router