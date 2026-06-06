const { getDb } = require('../db')

exports.createFeedback = (req, res) => {
  try {
    const db = getDb()
    const { title, content, contact } = req.body

    if (!content) {
      return res.status(400).json({ error: '反馈内容不能为空' })
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      .toISOString().replace('T', ' ').substring(0, 19)
    const recentCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM feedbacks WHERE ip_address = ? AND created_at > ?"
    ).get(req.clientIp, tenMinutesAgo)

    if (recentCount.cnt >= 1) {
      return res.status(429).json({ error: '提交过于频繁，请10分钟后再试' })
    }

    db.prepare(
      'INSERT INTO feedbacks (title, content, contact, ip_address) VALUES (?, ?, ?, ?)'
    ).run(title || '', content, contact || '', req.clientIp)

    res.status(201).json({ message: '反馈已提交' })
  } catch (err) {
    res.status(500).json({ error: '提交反馈失败' })
  }
}

exports.getFeedbacks = (req, res) => {
  try {
    const db = getDb()
    const { status } = req.query

    let sql = 'SELECT * FROM feedbacks'
    const params = []

    if (status !== undefined) {
      sql += ' WHERE status = ?'
      params.push(Number(status))
    }

    sql += ' ORDER BY created_at DESC'
    const feedbacks = db.prepare(sql).all(...params)
    res.json({ feedbacks })
  } catch (err) {
    res.status(500).json({ error: '获取反馈列表失败' })
  }
}

exports.getFeedback = (req, res) => {
  try {
    const db = getDb()
    const feedback = db.prepare('SELECT * FROM feedbacks WHERE id = ?').get(req.params.id)
    if (!feedback) {
      return res.status(404).json({ error: '反馈不存在' })
    }
    res.json({ feedback })
  } catch (err) {
    res.status(500).json({ error: '获取反馈详情失败' })
  }
}

exports.updateFeedbackStatus = (req, res) => {
  try {
    const db = getDb()
    const feedback = db.prepare('SELECT id FROM feedbacks WHERE id = ?').get(req.params.id)
    if (!feedback) {
      return res.status(404).json({ error: '反馈不存在' })
    }

    const { status } = req.body
    if (status === undefined || ![0, 1, 2].includes(status)) {
      return res.status(400).json({ error: '状态值无效（0=未读, 1=已读, 2=已处理）' })
    }

    db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(status, req.params.id)
    res.json({ message: '状态已更新' })
  } catch (err) {
    res.status(500).json({ error: '更新状态失败' })
  }
}

exports.deleteFeedback = (req, res) => {
  try {
    const db = getDb()
    const feedback = db.prepare('SELECT id FROM feedbacks WHERE id = ?').get(req.params.id)
    if (!feedback) {
      return res.status(404).json({ error: '反馈不存在' })
    }

    db.prepare('DELETE FROM feedbacks WHERE id = ?').run(req.params.id)
    res.json({ message: '反馈已删除' })
  } catch (err) {
    res.status(500).json({ error: '删除反馈失败' })
  }
}
