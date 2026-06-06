<template>
  <div>
    <div class="page-card">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">日历条目管理</h2>
        <div style="display:flex;gap:10px">
          <el-button type="success" @click="handleSync" :loading="syncing">
            <el-icon style="margin-right:4px"><Refresh /></el-icon>同步活动
          </el-button>
          <el-button type="primary" @click="openDialog(null)">
            <el-icon style="margin-right:4px"><Plus /></el-icon>添加条目
          </el-button>
        </div>
      </div>

      <el-table :data="allItems" v-loading="loading" style="width:100%">
        <el-table-column prop="title" label="名称" min-width="150" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.type === 'gacha' ? 'danger' : row.type === 'welfare' ? 'warning' : ''" size="small">
              {{ row.type === 'gacha' ? '🎴 卡池' : row.type === 'welfare' ? '🎁 福利' : '📅 活动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" min-width="260">
          <template #default="{ row }">{{ formatActivityDate(row.start_date) }} ~ {{ formatActivityDate(row.end_date) }}</template>
        </el-table-column>
        <el-table-column label="浏览量" width="80" align="center">
          <template #default="{ row }">
            {{ activityViewMap[row.id] || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="图片" width="70">
          <template #default="{ row }">
            <span v-if="row.image" class="img-thumb">
              <img :src="row.image" />
            </span>
            <span v-else style="color:#c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="颜色" width="70">
          <template #default="{ row }">
            <span class="color-swatch" :style="{background: row.color || '#409EFF'}" />
          </template>
        </el-table-column>
        <el-table-column label="可见" width="70">
          <template #default="{ row }">
            <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
              {{ row.is_visible ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="同步状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_synced ? 'success' : 'warning'" size="small">
              {{ row.is_synced ? '已同步' : '未同步' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除？关联评论也会删除" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editTitle"
      width="560px"
      destroy-on-close
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio value="activity">📅 活动</el-radio>
            <el-radio value="gacha">🎴 卡池</el-radio>
            <el-radio value="welfare">🎁 福利</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.title" placeholder="如：周年庆盛典 / 限定卡池" maxlength="100" />
        </el-form-item>
        <el-form-item label="介绍">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述..." maxlength="500" />
        </el-form-item>
        <el-form-item label="图片">
          <div class="image-upload">
            <div v-if="form.image" class="image-preview">
              <img :src="form.image" />
              <el-button size="small" type="danger" circle class="img-remove" @click="form.image = ''">×</el-button>
            </div>
            <el-upload
              v-else
              :action="uploadUrl"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :on-success="onUploadSuccess"
              :on-error="onUploadError"
              accept=".png,.jpg,.jpeg,.gif,.webp"
            >
              <el-button size="small">
                <el-icon style="margin-right:4px"><Upload /></el-icon>上传图片
              </el-button>
            </el-upload>
            <span class="upload-tip">支持 PNG/JPG/GIF/WebP，≤2MB</span>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始时间" required>
              <el-date-picker v-model="form.start_date" type="datetime" placeholder="选择日期时间" style="width:100%" value-format="YYYY-MM-DD HH:mm" :default-time="new Date(2000, 0, 1, 0, 0)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" required>
              <el-date-picker v-model="form.end_date" type="datetime" placeholder="选择日期时间" style="width:100%" value-format="YYYY-MM-DD HH:mm" :default-time="new Date(2000, 0, 1, 0, 0)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="显示颜色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="前台可见">
          <el-switch v-model="form.is_visible" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ editingId ? '保存修改' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Upload, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api'
import { formatActivityDate } from '../utils/format'

const activities = ref([])
const gachas = ref([])
const welfares = ref([])
const activityViewMap = ref({})
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const syncing = ref(false)
const editingId = ref(null)

const allItems = computed(() => [...activities.value, ...gachas.value, ...welfares.value])

const uploadUrl = '/api/upload'

const editTitle = computed(() => {
  if (!editingId.value) return '添加条目'
  if (form.type === 'gacha') return '编辑卡池'
  if (form.type === 'welfare') return '编辑福利'
  return '编辑活动'
})

const defaultForm = () => ({
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  color: '#409EFF',
  type: 'activity',
  image: '',
  is_visible: 1,
})
const form = reactive(defaultForm())

function beforeUpload(file) {
  const valid = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    .some((ext) => file.name.toLowerCase().endsWith(ext))
  if (!valid) ElMessage.warning('仅支持 PNG/JPG/GIF/WebP 格式')
  return valid
}

function onUploadSuccess(res) {
  form.image = res.url
  ElMessage.success('图片上传成功')
}

function onUploadError() {
  ElMessage.error('图片上传失败')
}

async function loadActivities() {
  loading.value = true
  try {
    const { data } = await api.get('/activities')
    activities.value = data.activities || []
    gachas.value = data.gachas || []
    welfares.value = data.welfares || []
  } finally {
    loading.value = false
  }
}

function openDialog(item) {
  if (item) {
    editingId.value = item.id
    Object.assign(form, {
      title: item.title,
      description: item.description,
      start_date: normalizeDateTime(item.start_date),
      end_date: normalizeDateTime(item.end_date),
      color: item.color || '#409EFF',
      type: item.type || 'activity',
      image: item.image || '',
      is_visible: item.is_visible,
    })
  } else {
    editingId.value = null
    Object.assign(form, defaultForm())
  }
  dialogVisible.value = true
}

function normalizeDateTime(val) {
  if (!val) return ''
  if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(val)) return val
  return val + ' 00:00'
}

async function handleSave() {
  if (!form.title || !form.start_date || !form.end_date) {
    ElMessage.warning('请填写必填项')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`/activities/${editingId.value}`, form)
      ElMessage.success('已更新')
    } else {
      await api.post('/activities', form)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadActivities()
  } catch {} finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await api.delete(`/activities/${id}`)
    ElMessage.success('已删除')
    await loadActivities()
  } catch {}
}

async function handleSync() {
  syncing.value = true
  try {
    const { data } = await api.post('/settings/sync')
    ElMessage.success(data.message || '同步时间已更新')
    await loadActivities()
  } catch {} finally {
    syncing.value = false
  }
}

onMounted(() => { loadActivities(); loadStats() })

async function loadStats() {
  try {
    const { data } = await api.get('/analytics/stats')
    activityViewMap.value = data.activity_view_map
  } catch {}
}
</script>

<style scoped>
.image-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.image-preview {
  position: relative;
  width: 64px;
  height: 64px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  font-size: 12px;
}

.img-thumb {
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
}

.img-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-tip {
  font-size: 12px;
  color: #c0c4cc;
}

.color-swatch {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
}
</style>
