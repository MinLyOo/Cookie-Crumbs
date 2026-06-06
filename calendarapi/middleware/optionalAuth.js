const jwt = require('jsonwebtoken')

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: '令牌无效或已过期' })
    }
  }
  next()
}

module.exports = optionalAuth
