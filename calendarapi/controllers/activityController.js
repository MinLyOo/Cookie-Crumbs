const { getDb } = require('../db')

exports.getActivities = (req, res) => {
  try {
    const db = getDb()
    const { start_date, end_date, type } = req.query
    const isAdmin = !!req.user

    let sql = 'SELECT * FROM activities'
    let where = []
    const params = []

    if (!isAdmin) {
      where.push('is_visible = 1')
      where.push('is_synced = 1')
      where.push('deleted_at IS NULL')
    }
    if (type) {
      where.push('type = ?')
      params.push(type)
    }
    if (start_date) {
      where.push('end_date >= ?')
      params.push(start_date)
    }
    if (end_date) {
      where.push('start_date <= ?')
      params.push(end_date)
    }
    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ')
    }

    sql += ' ORDER BY start_date ASC'

    const activities = db.prepare(sql).all(...params)

    if (type) {
      res.json({ activities })
    } else {
      const activityList = activities.filter((a) => a.type !== 'gacha' && a.type !== 'welfare')
      const gachaList = activities.filter((a) => a.type === 'gacha')
      const welfareList = activities.filter((a) => a.type === 'welfare')
      res.json({ activities: activityList, gachas: gachaList, welfares: welfareList })
    }
  } catch (err) {
    console.error('获取活动列表失败:', err.message)
    res.status(500).json({ error: '获取活动列表失败' })
  }
}

exports.getActivity = (req, res) => {
  try {
    const db = getDb()
    const isAdmin = !!req.user
    const activity = isAdmin
      ? db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
      : db.prepare('SELECT * FROM activities WHERE id = ? AND is_visible = 1 AND is_synced = 1 AND deleted_at IS NULL').get(req.params.id)
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' })
    }
    res.json({ activity })
  } catch (err) {
    console.error('获取活动详情失败:', err.message)
    res.status(500).json({ error: '获取活动详情失败' })
  }
}

exports.createActivity = (req, res) => {
  try {
    const db = getDb()
    const { title, description, start_date, end_date, color, type, image, is_visible } = req.body

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: '标题、开始时间和结束时间为必填项' })
    }
    if (start_date > end_date) {
      return res.status(400).json({ error: '开始时间不能晚于结束时间' })
    }

    const result = db.prepare(
      'INSERT INTO activities (title, description, start_date, end_date, color, type, image, is_visible, is_synced, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(title, description || '', start_date, end_date, color || '#409EFF', type || 'activity', image || '', is_visible !== undefined ? is_visible : 1, req.user.id)

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ activity })
  } catch (err) {
    console.error('创建活动失败:', err.message)
    res.status(500).json({ error: '创建活动失败: ' + err.message })
  }
}

exports.updateActivity = (req, res) => {
  try {
    const db = getDb()
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' })
    }

    const { title, description, start_date, end_date, color, type, image, is_visible } = req.body

    if (start_date && end_date && start_date > end_date) {
      return res.status(400).json({ error: '开始时间不能晚于结束时间' })
    }

    db.prepare(`
      UPDATE activities SET
        title = ?, description = ?, start_date = ?, end_date = ?,
        color = ?, type = ?, image = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title !== undefined ? title : activity.title,
      description !== undefined ? description : activity.description,
      start_date !== undefined ? start_date : activity.start_date,
      end_date !== undefined ? end_date : activity.end_date,
      color !== undefined ? color : activity.color,
      type !== undefined ? type : activity.type,
      image !== undefined ? image : activity.image,
      is_visible !== undefined ? is_visible : activity.is_visible,
      req.params.id
    )

    const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
    res.json({ activity: updated })
  } catch (err) {
    console.error('更新活动失败:', err.message)
    res.status(500).json({ error: '更新活动失败' })
  }
}

exports.deleteActivity = (req, res) => {
  try {
    const db = getDb()
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id)
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' })
    }

    db.prepare("UPDATE activities SET deleted_at = datetime('now') WHERE id = ?").run(req.params.id)
    res.json({ message: '活动已删除' })
  } catch (err) {
    console.error('删除活动失败:', err.message)
    res.status(500).json({ error: '删除活动失败' })
  }
}
