const { getDb } = require('../db')

// [已废弃] IP 黑名单功能已重构，以下三个函数暂时保留但不会被任何拦截逻辑调用，后续开发可跳过
exports.getBlacklist = (req, res) => {
  try {
    const db = getDb()
    const blacklist = db.prepare(
      'SELECT b.*, u.full_name as created_by_name FROM ip_blacklist b LEFT JOIN users u ON b.created_by = u.id ORDER BY b.created_at DESC'
    ).all()
    res.json({ blacklist })
  } catch (err) {
    res.status(500).json({ error: '获取黑名单失败' })
  }
}

exports.addToBlacklist = (req, res) => {
  try {
    const db = getDb()
    const { ip_address, reason } = req.body

    if (!ip_address) {
      return res.status(400).json({ error: 'IP地址不能为空' })
    }

    const existing = db.prepare('SELECT id FROM ip_blacklist WHERE ip_address = ?').get(ip_address)
    if (existing) {
      return res.status(409).json({ error: '该IP已在黑名单中' })
    }

    db.prepare(
      'INSERT INTO ip_blacklist (ip_address, reason, created_by) VALUES (?, ?, ?)'
    ).run(ip_address, reason || '', req.user.id)

    res.status(201).json({ message: 'IP已加入黑名单' })
  } catch (err) {
    res.status(500).json({ error: '添加黑名单失败' })
  }
}

exports.removeFromBlacklist = (req, res) => {
  try {
    const db = getDb()
    const entry = db.prepare('SELECT id FROM ip_blacklist WHERE id = ?').get(req.params.id)
    if (!entry) {
      return res.status(404).json({ error: '黑名单记录不存在' })
    }

    db.prepare('DELETE FROM ip_blacklist WHERE id = ?').run(req.params.id)
    res.json({ message: 'IP已从黑名单移除' })
  } catch (err) {
    res.status(500).json({ error: '移除黑名单失败' })
  }
}

exports.updateDevNote = (req, res) => {
  try {
    const db = getDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS dev_notes (
        id          INTEGER PRIMARY KEY DEFAULT 1,
        content     TEXT,
        updated_by  TEXT,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS dev_notes_history (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        old_content  TEXT,
        new_content  TEXT NOT NULL,
        changed_by   TEXT,
        changed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

    const { content } = req.body

    if (content === undefined || content === null || content.trim() === '') {
      return res.status(400).json({ error: '内容不能为空' })
    }
    if (content.length > 60) {
      return res.status(400).json({ error: '内容不能超过60字' })
    }

    const updatedBy = req.user.full_name || req.user.username

    const old = db.prepare('SELECT content FROM dev_notes WHERE id = 1').get()
    const oldContent = old ? old.content : ''

    const result = db.prepare(
      "UPDATE dev_notes SET content = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
    ).run(content, updatedBy)

    if (result.changes === 0) {
      db.prepare(
        "INSERT INTO dev_notes (id, content, updated_by, updated_at) VALUES (1, ?, ?, CURRENT_TIMESTAMP)"
      ).run(content, updatedBy)
    }

    db.prepare('INSERT INTO dev_notes_history (old_content, new_content, changed_by) VALUES (?, ?, ?)')
      .run(oldContent, content, updatedBy)

    res.json({ success: true, message: '开发者注已更新' })
  } catch (err) {
    console.error('updateDevNote error:', err.message)
    res.status(500).json({ error: '更新开发者注失败: ' + err.message })
  }
}

exports.syncActivities = (req, res) => {
  try {
    const db = getDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_info (
        id             INTEGER PRIMARY KEY DEFAULT 1,
        last_sync_time DATETIME
      );
    `)

    const unsyncedCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM activities WHERE is_synced = 0'
    ).get()

    db.prepare("UPDATE activities SET is_synced = 1 WHERE is_synced = 0").run()

    const result = db.prepare(
      "UPDATE sync_info SET last_sync_time = CURRENT_TIMESTAMP WHERE id = 1"
    ).run()

    if (result.changes === 0) {
      db.prepare(
        "INSERT INTO sync_info (id, last_sync_time) VALUES (1, CURRENT_TIMESTAMP)"
      ).run()
    }

    const row = db.prepare('SELECT last_sync_time FROM sync_info WHERE id = 1').get()
    res.json({
      success: true,
      message: `已同步 ${unsyncedCount.cnt} 条活动`,
      last_sync_time: row.last_sync_time,
      synced_count: unsyncedCount.cnt,
    })
  } catch (err) {
    console.error('syncActivities error:', err.message)
    res.status(500).json({ error: '同步失败: ' + err.message })
  }
}

exports.getDevNoteHistory = (req, res) => {
  try {
    const db = getDb()
    db.exec(`
      CREATE TABLE IF NOT EXISTS dev_notes_history (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        old_content  TEXT,
        new_content  TEXT NOT NULL,
        changed_by   TEXT,
        changed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    const history = db.prepare(
      'SELECT * FROM dev_notes_history ORDER BY changed_at DESC LIMIT 50'
    ).all()
    res.json({ history })
  } catch (err) {
    res.status(500).json({ error: '获取历史记录失败' })
  }
}
