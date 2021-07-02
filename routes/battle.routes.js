const express = require('express');
const router = express.Router();
const battleController = require('../controller/battle.controller');

router.post('/', battleController.createBattle)
router.get('/', battleController.getBattlesByUser)
router.get('/:id', battleController.getOneBattle)
router.put('/:id', battleController.updateScore)
router.put('/:id/accept', battleController.acceptBattle)
router.put('/:id/confirm', battleController.confirmScore)
router.delete('/:id', battleController.deleteBattle)



module.exports = router