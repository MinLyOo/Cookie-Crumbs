const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'calendar.db')

let db

function initDatabase() {
  db = new Database(DB_PATH)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name     TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT,
      start_date  DATE NOT NULL,
      end_date    DATE NOT NULL,
      color       TEXT DEFAULT '#409EFF',
      type        TEXT DEFAULT 'activity',
      image       TEXT,
      is_visible  INTEGER DEFAULT 1,
      is_synced   INTEGER DEFAULT 0,
      created_by  INTEGER REFERENCES users(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (start_date <= end_date)
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT,
      content     TEXT NOT NULL,
      contact     TEXT,
      ip_address  TEXT,
      status      INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- [已废弃] IP 黑名单功能已重构，此表暂时保留但不会被拦截中间件读取，后续开发可跳过
    CREATE TABLE IF NOT EXISTS ip_blacklist (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address  TEXT UNIQUE NOT NULL,
      reason      TEXT,
      created_by  INTEGER REFERENCES users(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS analytics_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type  TEXT NOT NULL,
      activity_id INTEGER,
      ip_address  TEXT,
      visitor_id  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_info (
      id             INTEGER PRIMARY KEY DEFAULT 1,
      last_sync_time DATETIME
    );

    CREATE TABLE IF NOT EXISTS message_words (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      word       TEXT NOT NULL UNIQUE,
      category   TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS activity_reactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id    INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      reaction_emoji TEXT NOT NULL,
      visitor_id     TEXT NOT NULL,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, reaction_emoji, visitor_id)
    );

    CREATE TABLE IF NOT EXISTS activity_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      words       TEXT NOT NULL,
      emoji       TEXT,
      visitor_id  TEXT NOT NULL,
      likes       INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES activity_messages(id) ON DELETE CASCADE,
      visitor_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, visitor_id)
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activities_dates ON activities(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
    CREATE INDEX IF NOT EXISTS idx_activities_visible_synced ON activities(is_visible, is_synced);
    CREATE INDEX IF NOT EXISTS idx_analytics_type_time ON analytics_events(event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_reactions_activity ON activity_reactions(activity_id);
    CREATE INDEX IF NOT EXISTS idx_messages_activity ON activity_messages(activity_id);
    CREATE INDEX IF NOT EXISTS idx_likes_message ON message_likes(message_id);
  `)

  try { db.exec("ALTER TABLE activities ADD COLUMN is_synced INTEGER DEFAULT 0") } catch {}
  db.exec("UPDATE activities SET is_synced = 1 WHERE is_synced IS NULL")

  try { db.exec("ALTER TABLE message_words ADD COLUMN category TEXT DEFAULT ''") } catch {}

  try { db.exec("ALTER TABLE analytics_events ADD COLUMN visitor_id TEXT") } catch {}

  try { db.exec("ALTER TABLE activities ADD COLUMN deleted_at DATETIME") } catch {}

  db.prepare("UPDATE activities SET start_date = start_date || ' 00:00' WHERE INSTR(start_date, ' ') = 0").run()
  db.prepare("UPDATE activities SET end_date = end_date || ' 00:00' WHERE INSTR(end_date, ' ') = 0").run()

  const insertWord = db.prepare('INSERT OR IGNORE INTO message_words (word, category, sort_order) VALUES (?, ?, ?)')
  const words = [
    ['卡池','subject',1],['活动','subject',2],['玩法','subject',3],['作业','subject',4],['挂机','subject',5],['干员','subject',6],['皮肤','subject',7],['剧情','subject',8],['饼！','subject',9],
    ['值得抽','evaluation',10],['值得练','evaluation',11],['夯爆了','evaluation',12],['拉完了','evaluation',13],['仓管','evaluation',14],['大杯','evaluation',15],['超大杯','evaluation',16],['中杯','evaluation',17],['小杯','evaluation',18],['基石','evaluation',19],['很肝','evaluation',20],['很难','evaluation',21],['简单','evaluation',22],['建议回坑','evaluation',23],['等进店','evaluation',24],['等复刻','evaluation',25],['等常驻','evaluation',26],
    ['沉了','supplement',27],['井了','supplement',28],['保底了','supplement',29],['无聊','supplement',30],['坐牢','supplement',31],['舒服','supplement',32],['好耶','supplement',33],['太棒了','supplement',34],['神','supplement',35],['真神','supplement',36],['做得好','supplement',37]
  ]
  for (const [word, cat, order] of words) {
    insertWord.run(word, cat, order)
  }

  return db
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

module.exports = { initDatabase, getDb }
