<template>
  <div class="app-root">
    <AboutPage v-if="showAboutPage" @back="showAboutPage = false" />
    <template v-else>
      <SiteHeader />

      <main class="app-main">
        <CalendarBoard @select-activity="handleSelectActivity" />
      </main>

      <ActivityDetailDialog
        v-model="dialogVisible"
        :activity="selectedActivity"
      />

      <div class="subscribe-fab">
        <el-tooltip content="订阅日历" placement="left">
          <el-button
            type="success"
            size="large"
            circle
            class="fab-button subscribe-btn"
            @click="showSubscribe = true"
          >
            📅
          </el-button>
        </el-tooltip>
      </div>

      <SubscribeDialog v-model="showSubscribe" />

      <FeedbackDialog />

      <footer class="app-footer">
        <p class="dev-note" v-if="devNote">💬 开发者注：{{ devNote }}</p>
        <p class="disclaimer">⚠️ 活动时间均为预测，请以游戏官方公告为准</p>
        <p class="disclaimer">✅ 若获得官方信息，本网站将及时同步更正</p>
        <p class="sync-info" v-if="lastSyncTime">⏰ 数据最后同步：{{ lastSyncTime }}</p>
        <p class="copyright">© 2026 Cookie Crumbs · 游戏活动日历</p>
        <p class="attribution">
          <span>图片来源：<a href="https://prts.wiki/" target="_blank" rel="noopener">PRTS wiki</a></span>
          <span class="sep">|</span>
          <span>日期预测：<a href="https://space.bilibili.com/8412516" target="_blank" rel="noopener">罗德岛蜜饼工坊（参考）</a></span>
          <span class="sep">|</span>
          <span><a href="#" @click.prevent="showAboutPage = true">关于网站</a></span>
        </p>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { trackEvent } from './utils/api'
import { formatDateTime } from './utils/date'
import SiteHeader from './components/SiteHeader.vue'
import CalendarBoard from './components/CalendarBoard.vue'
import ActivityDetailDialog from './components/ActivityDetailDialog.vue'
import FeedbackDialog from './components/FeedbackDialog.vue'
import SubscribeDialog from './components/SubscribeDialog.vue'
import AboutPage from './components/AboutPage.vue'

const dialogVisible = ref(false)
const selectedActivity = ref(null)
const devNote = ref('')
const lastSyncTime = ref('')
const showAboutPage = ref(false)
const showSubscribe = ref(false)

function handleSelectActivity(activity) {
  selectedActivity.value = activity
  dialogVisible.value = true
}

async function loadDevNote() {
  try {
    const { data } = await axios.get('/api/dev-note')
    devNote.value = data.content || ''
  } catch {}
}

async function loadSyncInfo() {
  try {
    const { data } = await axios.get('/api/sync-info')
    lastSyncTime.value = formatDateTime(data.last_sync_time)
  } catch {}
}

onMounted(() => { loadDevNote(); loadSyncInfo(); trackEvent('page_view') })
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
}

.app-footer {
  text-align: center;
  padding: 32px 0;
  color: #c0c4cc;
  font-size: 13px;
}

.app-footer .copyright {
  margin-bottom: 12px;
}

.app-footer .dev-note {
  font-style: italic;
  color: #909399;
  font-size: 12px;
  margin-bottom: 12px;
}

.app-footer .disclaimer {
  margin: 4px 0;
  font-size: 12px;
  color: #c0c4cc;
}

.app-footer .sync-info {
  margin: 8px 0;
  font-size: 12px;
  color: #909399;
}

.app-footer .attribution {
  margin: 4px 0;
  font-size: 12px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0 8px;
}

.app-footer .attribution .sep {
  color: #6c757d;
}

.app-footer .attribution a {
  color: #909399;
  text-decoration: none;
  transition: color 0.2s;
}

.app-footer .attribution a:hover {
  color: #409EFF;
  text-decoration: underline;
}

.subscribe-fab {
  position: fixed;
  bottom: 110px;
  right: 48px;
  z-index: 1000;
}

.subscribe-btn {
  width: 52px;
  height: 52px;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

@media (max-width: 768px) {
  .app-footer {
    padding: 20px 16px;
    font-size: 12px;
  }
  .app-footer .attribution {
    flex-direction: column;
    gap: 4px;
  }
  .subscribe-fab {
    bottom: 100px;
    right: 16px;
  }
  .subscribe-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
  .feedback-fab {
    bottom: 40px !important;
    right: 16px !important;
  }
  .feedback-fab .fab-button {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}
</style>
