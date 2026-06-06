<template>
  <el-dialog
    v-model="visible"
    :title="activity?.title || '详情'"
    width="620px"
    destroy-on-close
    center
    class="detail-dialog"
  >
    <div v-if="activity" class="activity-detail">
      <div class="detail-header">
        <img v-if="activity.image" :src="activity.image" class="detail-image" />
        <div v-else class="detail-char">{{ activity.title?.charAt(0) || '?' }}</div>
        <div class="detail-info">
          <div class="detail-meta">
            <el-tag :type="activity.type === 'gacha' ? 'danger' : ''" size="small">
              {{ activity.type === 'gacha' ? '🎴 卡池' : '📅 活动' }}
            </el-tag>
            <span class="meta-date">
              {{ formatActivityDate(activity.start_date) }} ~ {{ formatActivityDate(activity.end_date) }}
            </span>
          </div>
          <p class="detail-desc">{{ activity.description || '暂无介绍' }}</p>
        </div>
      </div>
    </div>

    <el-divider />

    <div v-if="activity" class="interaction-section">
      <div class="reaction-bar">
        <div v-if="reactionLoading" class="loading-hint">加载中...</div>
        <template v-else>
          <button
            v-for="item in reactionBubbles"
            :key="item.emoji"
            class="reaction-bubble"
            :class="{ active: isReactionActive(item.emoji) }"
            @click="handleToggleReaction(item.emoji)"
          >
            <span class="bubble-emoji">{{ item.emoji }}</span>
            <span class="bubble-count">{{ item.count }}</span>
          </button>
          <div class="reaction-add-wrap" ref="pickerWrap">
            <button class="reaction-add-btn" @click.stop="togglePicker">+</button>
            <div v-if="pickerOpen" class="reaction-picker-popup">
              <button
                v-for="emoji in EMOJI_LIST"
                :key="'pop-' + emoji"
                class="picker-emoji-btn"
                :class="{ active: isReactionActive(emoji) }"
                @click="handleToggleReaction(emoji); pickerOpen = false"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="section-block">
        <div v-if="wordsLoading" class="loading-hint">加载中...</div>
        <template v-else>
          <div class="brick-box" ref="brickWrap" :class="{ expanded: brickExpanded }" @click="brickExpanded = true">
            <div class="brick-input-row">
              <span
                v-for="word in selectedWords"
                :key="word"
                class="brick-chip"
                @click.stop="toggleWord(word)"
              >
                {{ word }} <span class="chip-x">×</span>
              </span>
              <span v-if="brickExpanded && selectedWords.length < 3" class="brick-cursor">|</span>
              <span v-if="!brickExpanded && !selectedWords.length" class="brick-placeholder">点击输入积木文...</span>
              <span v-if="brickExpanded && selectedEmoji && selectedWords.length" class="brick-chip brick-chip-emoji" @click.stop="showEmojiPicker = !showEmojiPicker">{{ selectedEmoji }}</span>
            </div>

            <div v-if="brickExpanded" class="brick-expand-area" @click.stop>
              <div class="brick-word-row">
                <span
                  v-for="word in allBrickWords"
                  :key="word"
                  class="brick-word"
                  :class="{ active: selectedWords.includes(word) }"
                  @click="toggleWord(word)"
                >{{ word }}</span>
              </div>

              <div class="brick-bottom-row">
                <div class="brick-emoji-wrap" ref="brickEmojiWrap">
                  <button class="brick-emoji-btn" @click.stop="showEmojiPicker = !showEmojiPicker" :title="selectedEmoji || '表情'">
                    {{ selectedEmoji || '😊' }}
                  </button>
                  <div v-if="showEmojiPicker" class="brick-emoji-popup">
                    <button
                      v-for="emoji in EMOJI_LIST"
                      :key="'bem-' + emoji"
                      class="picker-emoji-btn"
                      :class="{ active: selectedEmoji === emoji }"
                      @click="selectedEmoji = selectedEmoji === emoji ? '' : emoji; showEmojiPicker = false"
                    >{{ emoji }}</button>
                  </div>
                </div>
                <span class="brick-counter">已选 {{ selectedWords.length }}/3</span>
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!selectedWords.length || submitLoading"
                  :loading="submitLoading"
                  @click="handleSubmitMessage"
                >发送</el-button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="section-block">
        <div class="comment-header-row">
          <h3 class="subsection-title">💬 评论</h3>
          <el-radio-group v-model="sortMode" size="small" @change="loadMessages">
            <el-radio-button value="time">最新</el-radio-button>
            <el-radio-button value="likes">最热</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="messagesLoading" class="loading-hint">加载中...</div>
        <template v-else>
          <div v-if="messages.length === 0" class="empty-hint">暂无留言，快来发表第一条吧</div>
          <div v-else class="message-list">
            <div v-for="msg in messages" :key="msg.id" class="message-item">
              <div class="message-main">
                <span class="message-author">{{ formatVisitorName(msg.visitor_id) }}</span>
                <span class="message-words">{{ (msg.words || []).join(' ') }}</span>
                <span v-if="msg.emoji" class="message-emoji">{{ msg.emoji }}</span>
              </div>
              <div class="message-meta">
                <span class="message-time">{{ formatRelativeTime(msg.created_at) }}</span>
                <button
                  class="like-btn"
                  :class="{ liked: msg.liked_by_current_user }"
                  @click="handleToggleLike(msg)"
                >
                  👍 {{ msg.likes || 0 }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getMessageWords,
  getReactions,
  toggleReaction,
  getCommunityMessages,
  postCommunityMessage,
  toggleLike,
} from '../utils/api'
import { getDisplayName } from '../utils/visitor'
import { formatRelativeTime } from '../utils/date'

function formatActivityDate(dateStr) {
  if (!dateStr) return ''
  if (dateStr.length <= 10) return dateStr
  const datePart = dateStr.slice(0, 10)
  const timePart = dateStr.slice(11, 16)
  if (timePart === '00:00') return datePart
  return datePart + ' ' + timePart
}

const EMOJI_LIST = [
  '❤️', '👍', '🎉', '🔥', '💪', '🤩', '😍', '🥰', '🙌', '👏',
  '💯', '😭', '💔', '😫', '😩', '😤', '👎', '💩', '🤮', '😒',
  '😑', '🥱', '😴', '❓', '🤔', '🎴', '💎', '🎁', '📅', '📖',
  '🎲', '💰', '🏆', '🙏', '💬', '📝', '👀', '👋', '🤝', '😂',
  '🤣', '🤪', '🥴', '🤡', '🐶', '🍪',
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  activity: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const reactionData = ref({ counts: {}, current: [] })
const reactionLoading = ref(false)
const pickerOpen = ref(false)
const pickerWrap = ref(null)
const reactionCounts = computed(() => reactionData.value.counts || {})

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function closePicker() {
  pickerOpen.value = false
}

function onDocumentClick(e) {
  if (pickerWrap.value && !pickerWrap.value.contains(e.target)) {
    pickerOpen.value = false
  }
  if (brickEmojiWrap.value && !brickEmojiWrap.value.contains(e.target)) {
    showEmojiPicker.value = false
  }
  if (brickExpanded.value && brickWrap.value && !brickWrap.value.contains(e.target)) {
    brickExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

const reactionBubbles = computed(() => {
  const counts = reactionCounts.value
  return Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
})

const wordLib = ref({ subjects: [], evaluations: [], supplements: [] })
const wordsLoading = ref(false)
const selectedWords = ref([])
const selectedEmoji = ref('')
const submitLoading = ref(false)
const brickExpanded = ref(false)
const showEmojiPicker = ref(false)
const brickWrap = ref(null)
const brickEmojiWrap = ref(null)

const allBrickWords = computed(() => [
  ...wordLib.value.subjects,
  ...wordLib.value.evaluations,
  ...wordLib.value.supplements,
])

const messages = ref([])
const messagesLoading = ref(false)
const sortMode = ref('time')

function isReactionActive(emoji) {
  const cur = reactionData.value.current
  if (Array.isArray(cur)) return cur.includes(emoji)
  return cur === emoji
}

function formatVisitorName(visitorId) {
  if (!visitorId) return '博士#????'
  return '博士#' + visitorId.slice(-4)
}

function toggleWord(word) {
  const idx = selectedWords.value.indexOf(word)
  if (idx >= 0) {
    selectedWords.value.splice(idx, 1)
  } else if (selectedWords.value.length < 3) {
    selectedWords.value.push(word)
  }
}

async function loadReactions() {
  if (!props.activity?.id) return
  reactionLoading.value = true
  try {
    const { data } = await getReactions(props.activity.id)
    reactionData.value = data || { counts: {}, current: [] }
  } catch {
    reactionData.value = { counts: {}, current: [] }
  } finally {
    reactionLoading.value = false
  }
}

async function handleToggleReaction(emoji) {
  if (!props.activity?.id) return
  try {
    await toggleReaction(props.activity.id, emoji)
    await loadReactions()
  } catch (err) {
    const msg = err.response?.data?.error || '操作失败'
    ElMessage.error(msg)
  }
}

function closeEmojiPicker() {
  showEmojiPicker.value = false
}

async function loadWords() {
  wordsLoading.value = true
  try {
    const { data } = await getMessageWords()
    if (data.subjects) {
      wordLib.value = {
        subjects: data.subjects || [],
        evaluations: data.evaluations || [],
        supplements: data.supplements || [],
      }
    } else {
      wordLib.value = { subjects: [], evaluations: [], supplements: [] }
    }
  } catch {
    wordLib.value = { subjects: [], evaluations: [], supplements: [] }
  } finally {
    wordsLoading.value = false
  }
}

async function loadMessages() {
  if (!props.activity?.id) return
  messagesLoading.value = true
  try {
    const { data } = await getCommunityMessages(props.activity.id, sortMode.value)
    messages.value = data.messages || data || []
  } catch {
    messages.value = []
  } finally {
    messagesLoading.value = false
  }
}

async function handleSubmitMessage() {
  if (!selectedWords.value.length || !props.activity?.id || submitLoading.value) return
  submitLoading.value = true
  try {
    await postCommunityMessage(props.activity.id, {
      words: selectedWords.value,
      emoji: selectedEmoji.value || '',
    })
    selectedWords.value = []
    selectedEmoji.value = ''
    brickExpanded.value = false
    ElMessage.success('留言发送成功！')
    await loadMessages()
  } catch (err) {
    if (err.response?.status === 429) {
      ElMessage.warning('留言过于频繁，请稍后再试')
    } else {
      const msg = err.response?.data?.error || '发送失败，请重试'
      ElMessage.error(msg)
    }
  } finally {
    submitLoading.value = false
  }
}

async function handleToggleLike(message) {
  if (!message?.id) return
  try {
    await toggleLike(message.id)
    message.likes = (message.likes || 0) + (message.liked_by_current_user ? -1 : 1)
    message.liked_by_current_user = !message.liked_by_current_user
  } catch {
    ElMessage.error('操作失败')
  }
}

watch(visible, (val) => {
  if (val && props.activity) {
    loadReactions()
    loadWords()
    loadMessages()
  }
})

watch(() => props.activity, (newVal) => {
  if (visible.value && newVal) {
    selectedWords.value = []
    selectedEmoji.value = ''
    brickExpanded.value = false
    loadReactions()
    loadMessages()
  }
})
</script>

<style scoped>
.activity-detail {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-image {
  width: 100%;
  height: auto;
  max-height: 220px;
  border-radius: 8px;
  object-fit: contain;
  background: #f5f7fa;
}

.detail-char {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.meta-date {
  font-size: 14px;
  color: #606266;
}

.detail-desc {
  font-size: 15px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-line;
}

.interaction-section {
  padding: 0 0 8px;
}

.section-block {
  margin-bottom: 24px;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  margin-top: 0;
}

.loading-hint {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 16px 0;
}

.reaction-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.reaction-bubble {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 14px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 14px;
}

.reaction-bubble:hover {
  border-color: #409EFF;
  background: #ecf5ff;
}

.reaction-bubble.active {
  border-color: #409EFF;
  background: #ecf5ff;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.25);
}

.bubble-emoji {
  font-size: 16px;
  line-height: 1;
}

.bubble-count {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.reaction-bubble.active .bubble-count {
  color: #409EFF;
}

.reaction-add-wrap {
  position: relative;
}

.reaction-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px dashed #dcdfe6;
  border-radius: 14px;
  background: #fff;
  color: #909399;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.reaction-add-btn:hover {
  border-color: #409EFF;
  color: #409EFF;
  background: #f5f7fa;
}

.reaction-picker-popup {
  position: absolute;
  bottom: 36px;
  left: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 260px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.picker-emoji-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.picker-emoji-btn:hover {
  background: #f0f2f5;
}

.picker-emoji-btn.active {
  background: #ecf5ff;
}

.brick-box {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: text;
  transition: border-color 0.2s;
  background: #fff;
}

.brick-box:hover {
  border-color: #c0c4cc;
}

.brick-box.expanded {
  border-color: #409EFF;
  cursor: default;
  padding-bottom: 0;
}

.brick-input-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.brick-placeholder {
  color: #c0c4cc;
  font-size: 14px;
}

.brick-cursor {
  color: #409EFF;
  font-weight: 300;
  font-size: 16px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.brick-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 10px;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 14px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.brick-chip:hover {
  background: #d9ecff;
}

.chip-x {
  font-weight: 700;
  font-size: 12px;
  opacity: 0.5;
  margin-left: 2px;
}

.brick-chip-emoji {
  background: #fdf6ec;
  color: #e6a23c;
  cursor: pointer;
}

.brick-chip-emoji:hover {
  background: #fae7cc;
}

.brick-expand-area {
  padding: 14px 0 12px;
  border-top: 1px solid #ebeef5;
  margin-top: 10px;
}

.brick-word-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.brick-word {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 14px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
  background: #fafafa;
}

.brick-word:hover {
  border-color: #409EFF;
  color: #409EFF;
}

.brick-word.active {
  border-color: #409EFF;
  background: #ecf5ff;
  color: #409EFF;
}

.brick-bottom-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brick-emoji-wrap {
  position: relative;
}

.brick-emoji-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.brick-emoji-btn:hover {
  border-color: #409EFF;
  background: #f5f7fa;
}

.brick-emoji-popup {
  position: absolute;
  bottom: 42px;
  left: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 260px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.brick-counter {
  font-size: 12px;
  color: #909399;
}

.comment-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.comment-header-row .subsection-title {
  margin-bottom: 0;
}

.empty-hint {
  text-align: center;
  color: #c0c4cc;
  font-size: 14px;
  padding: 24px 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
  gap: 8px;
}

.message-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.message-author {
  font-size: 13px;
  font-weight: 600;
  color: #409EFF;
  flex-shrink: 0;
}

.message-words {
  font-size: 14px;
  color: #303133;
  word-break: break-all;
}

.message-emoji {
  font-size: 18px;
  flex-shrink: 0;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
  white-space: nowrap;
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
</style>

<style>
@media (max-width: 640px) {
  .detail-dialog {
    width: 100% !important;
    max-width: 100% !important;
    margin-top: 0 !important;
  }
  .detail-dialog .el-dialog__body {
    padding: 12px 16px;
  }
}
</style>
