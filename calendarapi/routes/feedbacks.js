const router = require('express').Router()
const feedbackController = require('../controllers/feedbackController')
const authMiddleware = require('../middleware/auth')

router.post('/', feedbackController.createFeedback)

router.get('/', authMiddleware, feedbackController.getFeedbacks)
router.get('/:id', authMiddleware, feedbackController.getFeedback)
router.put('/:id/status', authMiddleware, feedbackController.updateFeedbackStatus)
router.delete('/:id', authMiddleware, feedbackController.deleteFeedback)

module.exports = router
