<template>
  <div>
    <h2 style="margin-bottom:20px;font-size:20px;font-weight:600">仪表盘</h2>

    <div class="dashboard-top">
      <div class="page-card trend-panel">
        <h3 style="margin-bottom:16px;font-size:16px;font-weight:600">📈 日访问趋势</h3>
        <v-chart v-if="dailyTrend.length" class="trend-chart" :option="chartOption" autoresize />
        <div v-else class="trend-empty">暂无访问数据</div>
      </div>

      <div class="stat-cards">
        <div class="stat-card">
          <div class="label">活动数</div>
          <div class="value">{{ stats.activityCount }}</div>
        </div>
        <div class="stat-card">
          <div class="label">卡池数</div>
          <div class="value" style="color:#F56C6C">{{ stats.gachaCount }}</div>
        </div>
        <div class="stat-card">
          <div class="label">福利数</div>
          <div class="value" style="color:#E6A23C">{{ stats.welfareCount }}</div>
        </div>
        <div class="stat-card">
          <div class="label">未读反馈</div>
          <div class="value danger">{{ stats.unreadFeedbacks }}</div>
        </div>
        <div class="stat-card">
          <div class="label">网站浏览量</div>
          <div class="value" style="color:#409EFF">{{ stats.pageViews }}</div>
        </div>
        <div class="stat-card">
          <div class="label">活动浏览量</div>
          <div class="value" style="color:#67C23A">{{ stats.activityViews }}</div>
        </div>
        <div class="stat-card">
          <div class="label">点击量</div>
          <div class="value" style="color:#E6A23C">{{ stats.interactions }}</div>
        </div>
        <div class="stat-card">
          <div class="label">首次访问量</div>
          <div class="value" style="color:#9B59B6">{{ stats.uniqueVisitors }}</div>
        </div>
        <div class="stat-card">
          <div class="label">📅 订阅人数</div>
          <div class="value" style="color:#00BCD4">{{ stats.icsSubscribers }}</div>
        </div>
        <div class="stat-card">
          <div class="label">📥 ICS 拉取次数</div>
          <div class="value" style="color:#2D8CF0">{{ stats.icsFetchCount }}</div>
        </div>
      </div>
    </div>

    <div class="page-card">
      <h3 style="margin-bottom:16px;font-size:16px;font-weight:600">最近条目</h3>
      <el-table :data="recentItems" style="width:100%" size="small">
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'gacha' ? 'danger' : row.type === 'welfare' ? 'warning' : ''" size="small">
              {{ row.type === 'gacha' ? '卡池' : row.type === 'welfare' ? '福利' : '活动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" />
        <el-table-column label="时间" width="240">
          <template #default="{ row }">
            {{ formatActivityDate(row.start_date) }} ~ {{ formatActivityDate(row.end_date) }}
          </template>
        </el-table-column>
        <el-table-column label="浏览量" width="90" align="center">
          <template #default="{ row }">
            {{ activityViewMap[row.id] || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import 'echarts'
import api from '../utils/api'
import { formatDateTime, formatActivityDate } from '../utils/format'

const stats = reactive({ activityCount: 0, gachaCount: 0, welfareCount: 0, unreadFeedbacks: 0, pageViews: 0, activityViews: 0, interactions: 0, uniqueVisitors: 0, icsSubscribers: 0, icsFetchCount: 0 })
const recentItems = ref([])
const activityViewMap = ref({})
const dailyTrend = ref([])

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: '#e4e7ed',
    textStyle: { color: '#303133', fontSize: 13 },
  },
  xAxis: {
    type: 'category',
    data: dailyTrend.value.map((d) => d.date),
    axisLine: { lineStyle: { color: '#dcdfe6' } },
    axisLabel: { color: '#909399', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: '#f0f2f5' } },
    axisLabel: { color: '#909399', fontSize: 11 },
  },
  series: [{
    name: '访问量',
    type: 'line',
    data: dailyTrend.value.map((d) => d.count),
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    areaStyle: { color: 'rgba(64,158,255,0.1)' },
    lineStyle: { color: '#409EFF', width: 2.5 },
    itemStyle: { color: '#409EFF' },
  }],
  grid: { top: 15, right: 20, bottom: 25, left: 45 },
}))

onMounted(async () => {
  try {
    const [actRes, fbRes, statsRes, trendRes] = await Promise.all([
      api.get('/activities'),
      api.get('/feedbacks'),
      api.get('/analytics/stats'),
      api.get('/analytics/daily-trend'),
    ])
    const activities = actRes.data.activities || []
    const gachas = actRes.data.gachas || []
    const welfares = actRes.data.welfares || []
    stats.activityCount = activities.length
    stats.gachaCount = gachas.length
    stats.welfareCount = welfares.length
    stats.unreadFeedbacks = (fbRes.data.feedbacks || []).filter((f) => f.status === 0).length

    const statsData = statsRes.data
    stats.pageViews = statsData.page_views
    stats.activityViews = statsData.activity_views
    stats.interactions = statsData.interactions
    stats.uniqueVisitors = statsData.unique_visitors
    stats.icsSubscribers = statsData.ics_subscribers
    stats.icsFetchCount = statsData.ics_fetch_count
    activityViewMap.value = statsData.activity_view_map

    dailyTrend.value = trendRes.data.trend || []

    const all = [...activities, ...gachas, ...welfares]
    all.sort((a, b) => new Date(b.updated_at + 'Z') - new Date(a.updated_at + 'Z'))
    recentItems.value = all.slice(0, 8)
  } catch {}
})
</script>

<style scoped>
.dashboard-top {
  display: grid;
  grid-template-columns: 1fr 312px;
  gap: 20px;
  margin-bottom: 0;
  align-items: stretch;
}

.trend-panel {
  display: flex;
  flex-direction: column;
}

.trend-chart {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.trend-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 14px;
}

.stat-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 0;
}

.stat-card {
  text-align: center;
  padding: 18px 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-card .label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
}

.stat-card .value.danger {
  color: #F56C6C;
}
</style>
