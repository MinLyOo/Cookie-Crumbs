function backupKeyMiddleware(req, res, next) {
  let key = req.headers['x-backup-key']
  if (!key) {
    key = req.query.backup_key
  }

  if (!key) {
    return res.status(403).json({ error: '缺少操作密钥' })
  }

  if (key !== process.env.BACKUP_SECRET_KEY) {
    return res.status(403).json({ error: '密钥错误，操作被拒绝' })
  }

  next()
}

module.exports = backupKeyMiddleware
