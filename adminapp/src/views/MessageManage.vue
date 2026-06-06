<template>
  <div>
    <div class="page-card">
      <div class="page-toolbar">
        <h2 style="font-size:18px;font-weight:600">💬 评论管理</h2>
        <span style="color:#909399;font-size:13px">共 {{ messages.length }} 条留言</span>
      </div>

      <div v-loading="loading" class="message-grid">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-card"
        >
          <div class="msg-card-top">
            <span class="msg-author">{{ formatVisitorName(msg.visitor_id) }}</span>
            <span class="msg-time">{{ formatRelativeTime(msg.created_at) }}</span>
          </div>

          <div class="msg-body">
            <span class="msg-words">{{ (msg.words || []).join(' ') }}</span>
            <span v-if="msg.emoji" class="msg-emoji">{{ msg.emoji }}</span>
          </div>

          <div class="msg-card-bottom">
            <span class="msg-activity" :title="msg.activity_title">{{ msg.activity_title }}</span>
            <div class="msg-actions">
              <button
                class="like-btn"
                :class="{ liked: msg.liked_by_admin }"
                @click="handleToggleLike(msg)"
              >
                👍 {{ msg.likes || 0 }}
              </button>
              <el-popconfirm title="确定删除该留言？" @confirm="handleDelete(msg.id)">
                <template #reference>
                  <button class="del-btn">🗑</button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>

        <div v-if="!loading && messages.length === 0" class="empty-state">
          暂无留言
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api'

const messages = ref([])
const loading = ref(false)

function formatVisitorName(visitorId) {
  if (!visitorId) return '博士#????'
  return '博士#' + visitorId.slice(-4)
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'Z')
  const now = Date.now()
  const diff = now - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + '分钟前'
  if (hours < 24) return hours + '小时前'
  if (days < 30) return days + '天前'
  return dateStr.slice(0, 10)
}

async function loadMessages() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/messages')
    messages.value = (data.messages || []).map((m) => ({
      ...m,
      liked_by_admin: m.liked_by_admin ?? false,
    }))
  } catch {
    messages.value = []
  } finally {
    loading.value = false
  }
}

async function handleToggleLike(msg) {
  try {
    const { data } = await api.post(`/admin/messages/${msg.id}/like`)
    msg.likes = data.likes
    msg.liked_by_admin = data.liked
  } catch {}
}

async function handleDelete(id) {
  try {
    await api.delete(`/admin/messages/${id}`)
    messages.value = messages.value.filter((m) => m.id !== id)
  } catch {}
}

onMounted(loadMessages)
</script>

<style scoped>
.message-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.msg-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s;
}

.msg-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.msg-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.msg-author {
  font-size: 14px;
  font-weight: 600;
  color: #409EFF;
}

.msg-time {
  font-size: 12px;
  color: #c0c4cc;
}

.msg-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.msg-words {
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
}

.msg-emoji {
  font-size: 18px;
}

.msg-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}

.msg-activity {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.msg-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  font-size: 13px;
  color: #909399;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.like-btn:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

.like-btn.liked {
  border-color: #e6a23c;
  color: #e6a23c;
  background: #fdf6ec;
}

.del-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.del-btn:hover {
  border-color: #F56C6C;
  color: #F56C6C;
  background: #fef0f0;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;
  color: #c0c4cc;
  font-size: 15px;
}
</style>
