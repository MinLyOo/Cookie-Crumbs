const router = require('express').Router()
const communityController = require('../controllers/communityController')

router.get('/message-words', communityController.getWords)

router.get('/activities/:id/reactions', communityController.getReactions)
router.post('/activities/:id/reactions', communityController.toggleReaction)

router.get('/activities/:id/messages', communityController.getMessages)
router.post('/activities/:id/messages', communityController.createMessage)

router.post('/messages/:id/like', communityController.toggleLike)

module.exports = router
