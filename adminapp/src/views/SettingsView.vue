<template>
  <div>
    <!-- [已废弃] IP 黑名单功能已重构，UI 暂时保留但无拦截中间件生效，后续开发可跳过 -->
    <div class="page-card" style="margin-bottom:24px">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">IP 黑名单</h2>
        <el-button type="primary" size="small" @click="openBlacklistDialog">添加 IP</el-button>
      </div>
      <el-table :data="blacklist" style="width:100%" empty-text="暂无黑名单">
        <el-table-column prop="ip_address" label="IP 地址" width="200" />
        <el-table-column prop="reason" label="封禁原因" min-width="200" />
        <el-table-column label="添加时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="created_by_name" label="操作人" width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-popconfirm title="确定移除该IP？" @confirm="handleRemoveBlacklist(row.id)">
              <template #reference>
                <el-button size="small" type="danger">移除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="page-card">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">💬 开发者注</h2>
        <el-button type="primary" size="small" :loading="devNoteSaving" @click="handleSaveDevNote">保存</el-button>
      </div>
      <el-input
        v-model="devNoteContent"
        maxlength="60"
        show-word-limit
        type="textarea"
        :rows="2"
        placeholder="写一段小话展示在页脚..."
      />
      <div style="margin-top:8px">
        <el-button size="small" text type="info" @click="showHistory = !showHistory">
          {{ showHistory ? '收起历史' : '查看历史' }}
        </el-button>
      </div>
      <div v-if="showHistory" style="margin-top:12px">
        <el-table :data="devNoteHistory" size="small" max-height="300" empty-text="暂无历史记录">
          <el-table-column label="新内容" min-width="200">
            <template #default="{ row }">{{ row.new_content }}</template>
          </el-table-column>
          <el-table-column label="旧内容" min-width="200">
            <template #default="{ row }">{{ row.old_content || '（空）' }}</template>
          </el-table-column>
          <el-table-column prop="changed_by" label="操作人" width="100" />
          <el-table-column label="操作时间" width="150">
            <template #default="{ row }">{{ formatDateTime(row.changed_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="blDialog" title="添加IP到黑名单" width="400px" destroy-on-close>
      <el-form :model="blForm" label-position="top">
        <el-form-item label="IP 地址" required>
          <el-input v-model="blForm.ip_address" placeholder="如 192.168.1.1" />
        </el-form-item>
        <el-form-item label="封禁原因">
          <el-input v-model="blForm.reason" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blDialog = false">取消</el-button>
        <el-button type="primary" :loading="blSaving" @click="handleAddBlacklist">添加</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'
import { formatDateTime } from '../utils/format'

const blacklist = ref([])

const blDialog = ref(false)
const blSaving = ref(false)
const blForm = reactive({ ip_address: '', reason: '' })

const devNoteContent = ref('')
const devNoteSaving = ref(false)
const devNoteHistory = ref([])
const showHistory = ref(false)

async function loadSettings() {
  try {
    const [blRes, dnRes] = await Promise.all([
      api.get('/settings/blacklist'),
      api.get('/dev-note'),
    ])
    blacklist.value = blRes.data.blacklist
    devNoteContent.value = dnRes.data.content || ''
  } catch {}
}

function openBlacklistDialog() {
  blForm.ip_address = ''
  blForm.reason = ''
  blDialog.value = true
}

async function handleAddBlacklist() {
  if (!blForm.ip_address) {
    ElMessage.warning('请输入IP地址')
    return
  }
  blSaving.value = true
  try {
    await api.post('/settings/blacklist', { ip_address: blForm.ip_address, reason: blForm.reason })
    ElMessage.success('IP已加入黑名单')
    blDialog.value = false
    await loadSettings()
  } catch {} finally {
    blSaving.value = false
  }
}

async function handleRemoveBlacklist(id) {
  try {
    await api.delete(`/settings/blacklist/${id}`)
    ElMessage.success('IP已从黑名单移除')
    await loadSettings()
  } catch {}
}

async function handleSaveDevNote() {
  if (!devNoteContent.value.trim()) {
    ElMessage.warning('请输入开发者注内容')
    return
  }
  devNoteSaving.value = true
  try {
    await api.put('/settings/dev-note', { content: devNoteContent.value.trim() })
    ElMessage.success('开发者注已更新')
    await loadDevNoteHistory()
  } catch {} finally {
    devNoteSaving.value = false
  }
}

async function loadDevNoteHistory() {
  try {
    const { data } = await api.get('/settings/dev-note/history')
    devNoteHistory.value = data.history
    showHistory.value = true
  } catch {}
}

onMounted(loadSettings)
</script>
