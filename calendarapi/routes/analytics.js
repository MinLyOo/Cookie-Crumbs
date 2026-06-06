const router = require('express').Router()
const { getDb } = require('../db')
const authMiddleware = require('../middleware/auth')

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || ''
}

const VALID_EVENT_TYPES = ['page_view', 'activity_view', 'interaction', 'ics_subscription']

router.post('/track', (req, res) => {
  try {
    const { event_type, activity_id, visitor_id } = req.body

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return res.status(400).json({ error: '无效的事件类型' })
    }

    const ip = getClientIp(req)
    const db = getDb()

    db.prepare(
      'INSERT INTO analytics_events (event_type, activity_id, ip_address, visitor_id) VALUES (?, ?, ?, ?)'
    ).run(event_type, activity_id || null, ip, visitor_id || null)

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: '记录事件失败' })
  }
})

router.get('/stats', authMiddleware, (req, res) => {
  try {
    const db = getDb()

    const pageViews = db.prepare(
      "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'page_view'"
    ).get()

    const activityViews = db.prepare(
      "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'activity_view'"
    ).get()

    const interactions = db.prepare(
      "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'interaction'"
    ).get()

    const uniqueVisitors = db.prepare(
      "SELECT COUNT(DISTINCT ip_address) AS count FROM analytics_events WHERE event_type = 'page_view'"
    ).get()

    const icsSubscribers = db.prepare(
      "SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_events WHERE event_type = 'ics_subscription'"
    ).get()

    const icsFetchCount = db.prepare(
      "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'ics_subscription'"
    ).get()

    const activityViewRows = db.prepare(
      "SELECT activity_id, COUNT(*) AS count FROM analytics_events WHERE event_type = 'activity_view' AND activity_id IS NOT NULL GROUP BY activity_id"
    ).all()

    const activityViewMap = {}
    activityViewRows.forEach((row) => {
      activityViewMap[row.activity_id] = row.count
    })

    res.json({
      page_views: pageViews.count,
      activity_views: activityViews.count,
      interactions: interactions.count,
      unique_visitors: uniqueVisitors.count,
      ics_subscribers: icsSubscribers.count,
      ics_fetch_count: icsFetchCount.count,
      activity_view_map: activityViewMap,
    })
  } catch {
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

router.get('/daily-trend', authMiddleware, (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT date(created_at) AS date, COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND date(created_at) >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all()
    res.json({ trend: rows })
  } catch {
    res.status(500).json({ error: '获取趋势数据失败' })
  }
})

module.exports = router
