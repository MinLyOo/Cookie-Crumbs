const { createBackup, restoreBackup, deleteBackup, getBackups, getBackupPath, setNote } = require('../utils/backup')
const path = require('path')

exports.getBackups = (req, res) => {
  try {
    const backups = getBackups()
    res.json({ backups })
  } catch (err) {
    res.status(500).json({ error: '获取备份列表失败' })
  }
}

exports.handleCreateBackup = (req, res) => {
  try {
    createBackup()
    const backups = getBackups()
    res.json({ success: true, message: '备份创建成功', backups })
  } catch (err) {
    res.status(500).json({ error: '创建备份失败' })
  }
}

exports.handleRestoreBackup = (req, res) => {
  try {
    const name = req.params.name
    if (!getBackupPath(name)) {
      return res.status(404).json({ error: '备份文件不存在' })
    }

    const ok = restoreBackup(name)
    if (!ok) {
      return res.status(500).json({ error: '恢复备份失败' })
    }

    res.json({ success: true, message: '数据库已恢复，请重启后端服务使数据生效' })
  } catch (err) {
    res.status(500).json({ error: '恢复备份失败' })
  }
}

exports.handleDeleteBackup = (req, res) => {
  try {
    const name = req.params.name
    if (!getBackupPath(name)) {
      return res.status(404).json({ error: '备份文件不存在' })
    }

    deleteBackup(name)
    const backups = getBackups()
    res.json({ success: true, message: '备份已删除', backups })
  } catch (err) {
    res.status(500).json({ error: '删除备份失败' })
  }
}

exports.handleDownloadBackup = (req, res) => {
  try {
    const name = req.params.name
    const filePath = getBackupPath(name)
    if (!filePath) {
      return res.status(404).json({ error: '备份文件不存在' })
    }

    res.download(filePath, name)
  } catch (err) {
    res.status(500).json({ error: '下载备份失败' })
  }
}

exports.handleUpdateNote = (req, res) => {
  try {
    const name = req.params.name
    if (!getBackupPath(name)) {
      return res.status(404).json({ error: '备份文件不存在' })
    }

    const note = req.body.note || ''
    setNote(name, note)
    res.json({ success: true, message: '备注已更新', note })
  } catch (err) {
    res.status(500).json({ error: '更新备注失败' })
  }
}
