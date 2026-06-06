const router = require('express').Router()
const activityController = require('../controllers/activityController')
const authMiddleware = require('../middleware/auth')
const optionalAuth = require('../middleware/optionalAuth')

router.get('/', optionalAuth, activityController.getActivities)
router.get('/:id', optionalAuth, activityController.getActivity)
router.post('/', authMiddleware, activityController.createActivity)
router.put('/:id', authMiddleware, activityController.updateActivity)
router.delete('/:id', authMiddleware, activityController.deleteActivity)

module.exports = router
