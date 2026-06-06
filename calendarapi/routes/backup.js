const express = require('express')
const jwt = require('jsonwebtoken')
const auth = require('../middleware/auth')
const backupKey = require('../middleware/backupKey')
const { getBackups, handleCreateBackup, handleRestoreBackup, handleDeleteBackup, handleDownloadBackup, handleUpdateNote } = require('../controllers/backupController')

const router = express.Router()

function downloadAuth(req, res, next) {
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.split(' ')[1])
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: '令牌无效或已过期' })
  }
}

router.get('/', auth, getBackups)
router.post('/create', auth, backupKey, handleCreateBackup)
router.post('/:name/restore', auth, backupKey, handleRestoreBackup)
router.delete('/:name', auth, backupKey, handleDeleteBackup)
router.get('/:name/download', downloadAuth, backupKey, handleDownloadBackup)
router.put('/:name/note', auth, handleUpdateNote)

module.exports = router
