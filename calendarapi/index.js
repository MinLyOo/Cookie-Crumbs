require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const multer = require('multer')
const sharp = require('sharp')
const compression = require('compression')
const fs = require('fs')
const { initDatabase, getDb } = require('./db')

const authRoutes = require('./routes/auth')
const activityRoutes = require('./routes/activities')
const feedbackRoutes = require('./routes/feedbacks')
const settingsRoutes = require('./routes/settings')
const analyticsRoutes = require('./routes/analytics')
const backupRoutes = require('./routes/backup')
const communityRoutes = require('./routes/community')
const adminMessageRoutes = require('./routes/adminMessages')

const app = express()

app.set('trust proxy', 1)

initDatabase()

const uploadsDir = path.join(__dirname, 'public', 'uploads')
require('fs').mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()))
  },
})

app.use(cors())
app.use(express.json())
app.use(compression())
app.use('/uploads', express.static(uploadsDir))

const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: '请求过于频繁，请稍后重试' },
})
app.use('/api', limiter)

const SIZE_THRESHOLD = 300 * 1024

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未选择文件或格式不支持' })
  }

  const inputPath = req.file.path
  const originalSize = req.file.size

  if (originalSize <= SIZE_THRESHOLD) {
    return res.json({ url: '/uploads/' + req.file.filename })
  }

  const webpPath = inputPath.replace(/\.[^.]+$/, '.webp')

  try {
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(webpPath)

    fs.unlinkSync(inputPath)

    const filename = path.basename(inputPath, path.extname(inputPath)) + '.webp'
    res.json({ url: '/uploads/' + filename })
  } catch (err) {
    console.error('压缩失败:', err)
    try { fs.unlinkSync(webpPath) } catch {}
    res.json({ url: '/uploads/' + req.file.filename })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/dev-note', (req, res) => {
  try {
    const db = getDb()
    const note = db.prepare('SELECT content FROM dev_notes WHERE id = 1').get()
    res.json({ content: note ? note.content : null })
  } catch {
    res.status(500).json({ error: '获取开发者注失败' })
  }
})

app.get('/api/sync-info', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT last_sync_time FROM sync_info WHERE id = 1').get()
    res.json({ last_sync_time: row ? row.last_sync_time : null })
  } catch {
    res.status(500).json({ error: '获取同步信息失败' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/feedbacks', feedbackRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/backup', backupRoutes)

const { generateIcs } = require('./utils/ics')

app.get('/api/calendar.ics', (req, res) => {
  try {
    const db = getDb()
    const { type } = req.query
    const params = []
    let sql = "SELECT * FROM activities WHERE is_visible = 1 AND is_synced = 1 AND deleted_at IS NULL"
    if (type && ['activity', 'gacha', 'welfare'].includes(type)) {
      sql += ' AND type = ?'
      params.push(type)
    }
    sql += ' ORDER BY start_date ASC'
    const activities = db.prepare(sql).all(...params)

    const host = req.headers.host || 'icookie.top'
    const ics = generateIcs(activities, host)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="cookiecrumbs.ics"')
    res.send(ics)

    const visitorId = req.headers['x-visitor-id'] || 'ics_bot'
    db.prepare(
      "INSERT INTO analytics_events (event_type, visitor_id, ip_address) VALUES ('ics_subscription', ?, ?)"
    ).run(visitorId, req.ip || '')
  } catch (err) {
    console.error('生成ICS失败:', err.message)
    res.status(500).json({ error: '生成日历失败' })
  }
})
app.use('/api', communityRoutes)
app.use('/api/admin', adminMessageRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: '服务器内部错误' })
})

const PORT = process.env.PORT || 30001
app.listen(PORT, () => {
  console.log(`Cookie Crumbs API 已启动: http://localhost:${PORT}`)
})
