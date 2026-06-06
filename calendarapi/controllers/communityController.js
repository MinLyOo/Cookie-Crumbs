const { getDb } = require('../db')

function requireVisitor(req, res) {
  const visitorId = req.headers['x-visitor-id']
  if (!visitorId) {
    return res.status(400).json({ error: '缺少访客身份标识' })
  }
  req.visitorId = visitorId
  return null
}

exports.getWords = (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT word, category FROM message_words WHERE is_active = 1 ORDER BY sort_order').all()
    const subjects = rows.filter((r) => r.category === 'subject').map((r) => r.word)
    const evaluations = rows.filter((r) => r.category === 'evaluation').map((r) => r.word)
    const supplements = rows.filter((r) => r.category === 'supplement').map((r) => r.word)
    res.json({ subjects, evaluations, supplements })
  } catch (err) {
    res.status(500).json({ error: '获取词库失败' })
  }
}

exports.getReactions = (req, res) => {
  try {
    const db = getDb()
    const activityId = req.params.id
    const visitorId = req.headers['x-visitor-id']

    const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId)
    if (!activity) return res.status(404).json({ error: '活动不存在' })

    const counts = {}
    const countRows = db.prepare('SELECT reaction_emoji, COUNT(*) as cnt FROM activity_reactions WHERE activity_id = ? GROUP BY reaction_emoji').all(activityId)
    for (const row of countRows) {
      counts[row.reaction_emoji] = row.cnt
    }

    let current = []
    if (visitorId) {
      current = db.prepare('SELECT reaction_emoji FROM activity_reactions WHERE activity_id = ? AND visitor_id = ?').all(activityId, visitorId).map((r) => r.reaction_emoji)
    }

    res.json({ counts, current })
  } catch (err) {
    res.status(500).json({ error: '获取表态列表失败' })
  }
}

exports.toggleReaction = (req, res) => {
  try {
    const err = requireVisitor(req, res)
    if (err) return err

    const db = getDb()
    const activityId = req.params.id
    const { emoji } = req.body

    if (!emoji) return res.status(400).json({ error: '缺少表情符号' })

    const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId)
    if (!activity) return res.status(404).json({ error: '活动不存在' })

    const existing = db.prepare('SELECT id FROM activity_reactions WHERE activity_id = ? AND reaction_emoji = ? AND visitor_id = ?').get(activityId, emoji, req.visitorId)
    if (existing) {
      db.prepare('DELETE FROM activity_reactions WHERE id = ?').run(existing.id)
    } else {
      db.prepare('INSERT INTO activity_reactions (activity_id, reaction_emoji, visitor_id) VALUES (?, ?, ?)').run(activityId, emoji, req.visitorId)
    }

    const counts = {}
    const countRows = db.prepare('SELECT reaction_emoji, COUNT(*) as cnt FROM activity_reactions WHERE activity_id = ? GROUP BY reaction_emoji').all(activityId)
    for (const row of countRows) { counts[row.reaction_emoji] = row.cnt }

    const current = db.prepare('SELECT reaction_emoji FROM activity_reactions WHERE activity_id = ? AND visitor_id = ?').all(activityId, req.visitorId).map((r) => r.reaction_emoji)

    res.json({ counts, current })
  } catch (err) {
    res.status(500).json({ error: '操作失败' })
  }
}

exports.getMessages = (req, res) => {
  try {
    const db = getDb()
    const activityId = req.params.id
    const visitorId = req.headers['x-visitor-id'] || ''
    const sort = req.query.sort === 'likes' ? 'likes DESC' : 'created_at DESC'

    const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId)
    if (!activity) return res.status(404).json({ error: '活动不存在' })

    const messages = db.prepare(`SELECT * FROM activity_messages WHERE activity_id = ? ORDER BY ${sort}`).all(activityId)

    const result = messages.map((m) => {
      let liked = false
      if (visitorId) {
        const like = db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND visitor_id = ?').get(m.id, visitorId)
        liked = !!like
      }
      return {
        id: m.id,
        words: JSON.parse(m.words),
        emoji: m.emoji || '',
        likes: m.likes,
        visitor_id: m.visitor_id,
        created_at: m.created_at,
        liked_by_current_user: liked,
      }
    })

    res.json({ messages: result })
  } catch (err) {
    res.status(500).json({ error: '获取留言列表失败' })
  }
}

exports.createMessage = (req, res) => {
  try {
    const err = requireVisitor(req, res)
    if (err) return err

    const db = getDb()
    const activityId = req.params.id
    const { words, emoji } = req.body

    if (!Array.isArray(words) || words.length < 1 || words.length > 3) {
      return res.status(400).json({ error: '请选择1到3个词语' })
    }

    const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId)
    if (!activity) return res.status(404).json({ error: '活动不存在' })

    const today = new Date()
    const localDateStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')
    const dailyCount = db.prepare("SELECT COUNT(*) as cnt FROM activity_messages WHERE activity_id = ? AND visitor_id = ? AND date(created_at, 'localtime') = ?").get(activityId, req.visitorId, localDateStr)
    if (dailyCount.cnt >= 3) {
      return res.status(429).json({ error: '今日留言已达上限（3条）' })
    }

    const lastMsg = db.prepare("SELECT created_at FROM activity_messages WHERE visitor_id = ? ORDER BY created_at DESC LIMIT 1").get(req.visitorId)
    if (lastMsg) {
      const diff = Date.now() - new Date(lastMsg.created_at + 'Z').getTime()
      if (diff < 15000) {
        return res.status(429).json({ error: '操作过于频繁，请15秒后再试' })
      }
    }

    const result = db.prepare('INSERT INTO activity_messages (activity_id, words, emoji, visitor_id) VALUES (?, ?, ?, ?)').run(activityId, JSON.stringify(words), emoji || '', req.visitorId)
    const message = db.prepare('SELECT * FROM activity_messages WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({
      message: {
        id: message.id,
        words: JSON.parse(message.words),
        emoji: message.emoji || '',
        likes: message.likes,
        visitor_id: message.visitor_id,
        created_at: message.created_at,
        liked_by_current_user: false,
      },
    })
  } catch (err) {
    res.status(500).json({ error: '留言发表失败' })
  }
}

exports.toggleLike = (req, res) => {
  try {
    const err = requireVisitor(req, res)
    if (err) return err

    const db = getDb()
    const messageId = req.params.id

    const message = db.prepare('SELECT id FROM activity_messages WHERE id = ?').get(messageId)
    if (!message) return res.status(404).json({ error: '留言不存在' })

    const existing = db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND visitor_id = ?').get(messageId, req.visitorId)
    if (existing) {
      db.prepare('DELETE FROM message_likes WHERE id = ?').run(existing.id)
      db.prepare('UPDATE activity_messages SET likes = likes - 1 WHERE id = ?').run(messageId)
    } else {
      db.prepare('INSERT INTO message_likes (message_id, visitor_id) VALUES (?, ?)').run(messageId, req.visitorId)
      db.prepare('UPDATE activity_messages SET likes = likes + 1 WHERE id = ?').run(messageId)
    }

    const updated = db.prepare('SELECT likes FROM activity_messages WHERE id = ?').get(messageId)
    const liked = !existing

    res.json({ likes: updated.likes, liked })
  } catch (err) {
    res.status(500).json({ error: '点赞操作失败' })
  }
}
