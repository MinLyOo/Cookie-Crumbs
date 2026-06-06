require('dotenv').config()
const bcrypt = require('bcrypt')
const { initDatabase } = require('./db')

// [已废弃] 敏感词过滤功能已重构，此常量及下方插入逻辑暂时保留但不会使用，后续开发可跳过
const DEFAULT_BANNED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'bastard', 'dick', 'piss',
  '他妈的', '操你', '傻逼', 'sb', 'cnm', 'nmsl',
  'fxxk', 'sh1t', 'azz', 'b1tch',
]

async function seed() {
  const db = initDatabase()

  if (!process.env.ADMIN_PASSWORD) {
    console.error('错误: 未设置 ADMIN_PASSWORD 环境变量，拒绝使用默认密码创建管理员账号')
    process.exit(1)
  }
  if (!process.env.JWT_SECRET) {
    console.error('错误: 未设置 JWT_SECRET 环境变量，拒绝使用空密钥启动服务')
    process.exit(1)
  }

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD
  const fullName = process.env.ADMIN_FULLNAME || 'Administrator'

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12)
    db.prepare('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)').run(username, passwordHash, fullName)
    console.log(`管理员账号已创建: ${username}`)
  } else {
    console.log(`管理员账号已存在: ${username}`)
  }

  // [已废弃] banned_words 表在 db.js 中从未创建，以下插入为无效操作，保留代码但不执行
  const insertWord = db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)')
  const insertMany = db.transaction((words) => {
    for (const word of words) {
      insertWord.run(word)
    }
  })
  insertMany(DEFAULT_BANNED_WORDS)
  console.log(`敏感词已初始化，共 ${DEFAULT_BANNED_WORDS.length} 条`)

  const devNoteExisting = db.prepare('SELECT id FROM dev_notes WHERE id = 1').get()
  if (!devNoteExisting) {
    db.prepare('INSERT INTO dev_notes (id, content) VALUES (1, ?)').run('欢迎来到 Cookie Crumbs，感谢你的支持！')
    console.log('默认开发者注已创建')
  }

  console.log('数据库初始化完成！')
}

seed().catch((err) => {
  console.error('初始化失败:', err)
  process.exit(1)
})
