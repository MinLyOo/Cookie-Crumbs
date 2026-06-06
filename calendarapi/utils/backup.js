const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(__dirname, '..', 'backups')
const DB_PATH = path.join(__dirname, '..', 'calendar.db')
const NOTES_FILE = path.join(__dirname, '..', 'backups', '_notes.json')

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function saveNotes(notes) {
  ensureBackupDir()
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8')
}

function getNote(name) {
  const notes = loadNotes()
  return notes[name] || ''
}

function setNote(name, text) {
  const notes = loadNotes()
  if (text) {
    notes[name] = text
  } else {
    delete notes[name]
  }
  saveNotes(notes)
}

function checkpointWAL() {
  try {
    const { getDb } = require('../db')
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')
  } catch {}
}

function createBackup() {
  ensureBackupDir()

  checkpointWAL()

  const today = new Date().toISOString().split('T')[0]
  const timestamp = Date.now()
  const backupFileName = `calendar.db.${today}.${timestamp}.bak`
  const backupPath = path.join(BACKUP_DIR, backupFileName)

  fs.copyFileSync(DB_PATH, backupPath)
  cleanupOldBackups()

  return backupPath
}

function cleanupOldBackups() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

  let files
  try {
    files = fs.readdirSync(BACKUP_DIR)
  } catch {
    return
  }

  for (const file of files) {
    if (!file.endsWith('.bak')) continue
    const filePath = path.join(BACKUP_DIR, file)
    try {
      const stats = fs.statSync(filePath)
      if (stats.mtimeMs < sevenDaysAgo) {
        fs.unlinkSync(filePath)
      }
    } catch {}
  }
}

function restoreBackup(name) {
  const backupPath = getBackupPath(name)
  if (!backupPath) return false

  checkpointWAL()
  try { fs.unlinkSync(DB_PATH + '-wal') } catch {}
  try { fs.unlinkSync(DB_PATH + '-shm') } catch {}

  fs.copyFileSync(backupPath, DB_PATH)
  return true
}

function deleteBackup(name) {
  const backupPath = getBackupPath(name)
  if (!backupPath) return false

  fs.unlinkSync(backupPath)
  return true
}

function getBackups() {
  ensureBackupDir()

  let files
  try {
    files = fs.readdirSync(BACKUP_DIR)
  } catch {
    return []
  }

  const notes = loadNotes()
  const backups = []
  for (const file of files) {
    if (!file.endsWith('.bak')) continue
    const filePath = path.join(BACKUP_DIR, file)
    try {
      const stats = fs.statSync(filePath)
      backups.push({
        name: file,
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        note: notes[file] || '',
      })
    } catch {}
  }

  backups.sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
  return backups
}

function getBackupPath(name) {
  if (!name || typeof name !== 'string') return null
  if (!/^calendar\.db\.\d{4}-\d{2}-\d{2}\.\d+\.bak$/.test(name)) return null

  const filePath = path.join(BACKUP_DIR, name)
  const resolved = path.resolve(filePath)

  if (resolved !== path.resolve(BACKUP_DIR, name)) return null
  if (resolved.indexOf(path.resolve(BACKUP_DIR)) !== 0) return null

  if (!fs.existsSync(resolved)) return null

  return resolved
}

module.exports = {
  createBackup,
  restoreBackup,
  deleteBackup,
  getBackups,
  getBackupPath,
  getNote,
  setNote,
}
