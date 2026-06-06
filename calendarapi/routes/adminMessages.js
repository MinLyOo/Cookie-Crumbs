const router = require('express').Router()
const { getDb } = require('../db')
const authMiddleware = require('../middleware/auth')

router.get('/messages', authMiddleware, (req, res) => {
  try {
    const db = getDb()
    const adminVisitorId = 'admin_' + req.user.username

    const messages = db.prepare(`
      SELECT
        m.id, m.words, m.emoji, m.visitor_id, m.likes, m.created_at,
        a.title AS activity_title, a.id AS activity_id,
        EXISTS(SELECT 1 FROM message_likes WHERE message_id = m.id AND visitor_id = ?) AS liked_by_admin
      FROM activity_messages m
      LEFT JOIN activities a ON m.activity_id = a.id
      ORDER BY m.created_at DESC
    `).all(adminVisitorId)

    const result = messages.map((m) => ({
      id: m.id,
      words: JSON.parse(m.words),
      emoji: m.emoji || '',
      visitor_id: m.visitor_id,
      likes: m.likes,
      created_at: m.created_at,
      activity_title: m.activity_title || '(已删除的活动)',
      activity_id: m.activity_id,
      liked_by_admin: !!m.liked_by_admin,
    }))

    res.json({ messages: result })
  } catch (err) {
    res.status(500).json({ error: '获取留言列表失败' })
  }
})

router.delete('/messages/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb()
    const message = db.prepare('SELECT id FROM activity_messages WHERE id = ?').get(req.params.id)
    if (!message) {
      return res.status(404).json({ error: '留言不存在' })
    }

    db.prepare('DELETE FROM message_likes WHERE message_id = ?').run(req.params.id)
    db.prepare('DELETE FROM activity_messages WHERE id = ?').run(req.params.id)

    res.json({ message: '留言已删除' })
  } catch (err) {
    res.status(500).json({ error: '删除留言失败' })
  }
})

router.post('/messages/:id/like', authMiddleware, (req, res) => {
  try {
    const db = getDb()
    const adminId = 'admin_' + req.user.username

    const message = db.prepare('SELECT id FROM activity_messages WHERE id = ?').get(req.params.id)
    if (!message) {
      return res.status(404).json({ error: '留言不存在' })
    }

    const existing = db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND visitor_id = ?').get(req.params.id, adminId)
    if (existing) {
      db.prepare('DELETE FROM message_likes WHERE id = ?').run(existing.id)
      db.prepare('UPDATE activity_messages SET likes = likes - 1 WHERE id = ?').run(req.params.id)
    } else {
      db.prepare('INSERT INTO message_likes (message_id, visitor_id) VALUES (?, ?)').run(req.params.id, adminId)
      db.prepare('UPDATE activity_messages SET likes = likes + 1 WHERE id = ?').run(req.params.id)
    }

    const updated = db.prepare('SELECT likes FROM activity_messages WHERE id = ?').get(req.params.id)
    res.json({ likes: updated.likes, liked: !existing })
  } catch (err) {
    res.status(500).json({ error: '点赞操作失败' })
  }
})

module.exports = router
