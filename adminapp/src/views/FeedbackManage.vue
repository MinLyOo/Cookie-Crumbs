<template>
  <div>
    <div class="page-card">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">反馈管理</h2>
        <el-radio-group v-model="filter" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button :value="0">未读</el-radio-button>
          <el-radio-button :value="1">已读</el-radio-button>
          <el-radio-button :value="2">已处理</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="feedbacks" v-loading="loading" style="width:100%">
        <el-table-column prop="title" label="标题" width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系方式" width="140" show-overflow-tooltip />
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusColors[row.status]" size="small">{{ statusMap[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-select
              :model-value="row.status"
              size="small"
              style="width:120px"
              @change="(v) => handleStatus(row, v)"
            >
              <el-option :value="0" label="未读" />
              <el-option :value="1" label="已读" />
              <el-option :value="2" label="已处理" />
            </el-select>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api'
import { formatDateTime, statusMap, statusColors } from '../utils/format'

const loading = ref(false)
const filter = ref('')
const feedbacks = ref([])

async function loadFeedbacks() {
  loading.value = true
  try {
    const params = filter.value !== '' ? { status: filter.value } : {}
    const { data } = await api.get('/feedbacks', { params })
    feedbacks.value = data.feedbacks
  } finally {
    loading.value = false
  }
}

async function handleStatus(row, status) {
  try {
    await api.put(`/feedbacks/${row.id}/status`, { status })
    row.status = status
    ElMessage.success('状态已更新')
  } catch {}
}

async function handleDelete(id) {
  try {
    await api.delete(`/feedbacks/${id}`)
    feedbacks.value = feedbacks.value.filter((f) => f.id !== id)
    ElMessage.success('反馈已删除')
  } catch {}
}

watch(filter, loadFeedbacks)
onMounted(loadFeedbacks)
</script>
