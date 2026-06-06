<template>
  <div>
    <div class="page-card">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">数据库备份</h2>
        <el-button type="primary" @click="withKey(doCreateBackup)">
          <el-icon style="margin-right:4px"><Plus /></el-icon>创建备份
        </el-button>
      </div>

      <el-table :data="backups" v-loading="loading" style="width:100%">
        <el-table-column prop="name" label="文件名" min-width="220" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatTime(row.mtime) }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="160">
          <template #default="{ row }">
            <span
              v-if="editingNote !== row.name"
              class="note-cell"
              @click="startEditNote(row)"
            >{{ row.note || '点击添加备注' }}</span>
            <el-input
              v-else
              v-model="noteText"
              size="small"
              placeholder="输入备注信息"
              @blur="saveNote(row)"
              @keydown.enter="saveNote(row)"
              @keydown.escape="cancelEditNote"
              ref="noteInput"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-popconfirm
              title="还原数据库到该备份节点？建议先创建当前库的备份"
              confirm-button-text="还原"
              cancel-button-text="取消"
              @confirm="withKey(() => doRestore(row))"
            >
              <template #reference>
                <el-button size="small" type="warning">还原至此</el-button>
              </template>
            </el-popconfirm>
            <el-button size="small" @click="withKey(() => doDownload(row))">下载</el-button>
            <el-popconfirm title="确定删除此备份？" @confirm="withKey(() => doDelete(row))">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && backups.length === 0" style="text-align:center;color:#c0c4cc;padding:40px">
        暂无备份，请点击「创建备份」按钮手动备份数据库
      </div>
    </div>

    <el-dialog v-model="keyVisible" title="操作验证" width="400px" :close-on-click-modal="false">
      <el-form @submit.prevent="confirmKey">
        <el-form-item label="请输入操作密钥">
          <el-input v-model="inputKey" type="password" placeholder="输入 BACKUP_SECRET_KEY" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="keyVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmKey">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="restoring" title="还原数据库" width="400px" :close-on-click-modal="false">
      <p style="margin-bottom:8px">正在将数据库还原到所选备份节点。</p>
      <p style="color:#E6A23C">⚠️ 还原后需要重启后端服务才能生效。</p>
      <p v-if="restoreMsg" style="margin-top:12px;color:#303133">{{ restoreMsg }}</p>
      <template #footer>
        <el-button @click="restoring = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '../utils/api'

const backups = ref([])
const loading = ref(false)
const keyVisible = ref(false)
const restoring = ref(false)
const restoreMsg = ref('')
const inputKey = ref('')
const editingNote = ref(null)
const noteText = ref('')
const noteInput = ref(null)
let pendingAction = null

function withKey(action) {
  pendingAction = action
  inputKey.value = ''
  keyVisible.value = true
}

function confirmKey() {
  if (!inputKey.value.trim()) {
    ElMessage.warning('请输入操作密钥')
    return
  }
  keyVisible.value = false
  if (pendingAction) {
    pendingAction()
    pendingAction = null
  }
}

function getAuthHeaders() {
  return { 'x-backup-key': inputKey.value }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function startEditNote(row) {
  editingNote.value = row.name
  noteText.value = row.note || ''
  nextTick(() => {
    const el = document.querySelector('.el-input__inner')
    if (el) el.focus()
  })
}

function cancelEditNote() {
  editingNote.value = null
  noteText.value = ''
}

async function saveNote(row) {
  const text = noteText.value.trim()
  editingNote.value = null
  noteText.value = ''
  try {
    await api.put(`/backup/${encodeURIComponent(row.name)}/note`, { note: text })
    row.note = text || ''
  } catch {}
}

async function loadBackups() {
  loading.value = true
  try {
    const { data } = await api.get('/backup')
    backups.value = data.backups || []
  } catch {
    backups.value = []
  } finally {
    loading.value = false
  }
}

async function doCreateBackup() {
  try {
    const { data } = await api.post('/backup/create', null, { headers: getAuthHeaders() })
    ElMessage.success(data.message || '备份创建成功')
    backups.value = data.backups || []
  } catch {}
}

async function doRestore(row) {
  restoring.value = true
  restoreMsg.value = ''
  try {
    const { data } = await api.post(`/backup/${encodeURIComponent(row.name)}/restore`, null, { headers: getAuthHeaders() })
    restoreMsg.value = data.message || '还原完成'
    ElMessage.success('数据库已还原')
  } catch (e) {
    restoreMsg.value = e.response?.data?.error || '还原失败'
  }
}

async function doDelete(row) {
  try {
    const { data } = await api.delete(`/backup/${encodeURIComponent(row.name)}`, { headers: getAuthHeaders() })
    ElMessage.success(data.message || '备份已删除')
    backups.value = data.backups || []
  } catch {}
}

function doDownload(row) {
  const token = localStorage.getItem('admin_token')
  const backupKey = inputKey.value
  const url = `/api/backup/${encodeURIComponent(row.name)}/download?token=${encodeURIComponent(token)}&backup_key=${encodeURIComponent(backupKey)}`
  window.open(url, '_blank')
}

onMounted(() => loadBackups())
</script>

<style scoped>
.note-cell {
  color: #909399;
  cursor: pointer;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-cell:hover {
  color: #409EFF;
}
</style>
