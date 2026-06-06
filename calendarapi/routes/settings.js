const router = require('express').Router()
const settingsController = require('../controllers/settingsController')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

// [已废弃] IP 黑名单功能已重构，以下路由暂时保留但无拦截中间件使用，后续开发可跳过
router.get('/blacklist', settingsController.getBlacklist)
router.post('/blacklist', settingsController.addToBlacklist)
router.delete('/blacklist/:id', settingsController.removeFromBlacklist)

router.put('/dev-note', settingsController.updateDevNote)
router.get('/dev-note/history', settingsController.getDevNoteHistory)

router.post('/sync', settingsController.syncActivities)

module.exports = router
