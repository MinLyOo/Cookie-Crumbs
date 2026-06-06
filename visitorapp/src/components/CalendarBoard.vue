<template>
  <div class="calendar-section section">
    <h2 class="section-title">
      📅 活动日历
      <span class="section-hint">💡 点击活动条查看详情和评论</span>
    </h2>
    <div class="rotate-hint" v-show="isNarrow">
       📱 建议横屏观看以获得最佳体验 <span class="arrow">→</span>
     </div>
    <div ref="timelineContainer" class="timeline-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Timeline } from 'vis-timeline/standalone'
import 'vis-timeline/styles/vis-timeline-graph2d.css'
import { getActivities, trackEvent } from '../utils/api'

const emit = defineEmits(['select-activity'])

const timelineContainer = ref(null)
const isNarrow = ref(window.innerWidth < 768)
let timeline = null

function checkWidth() {
  isNarrow.value = window.innerWidth < 768
}

const groups = [
  { id: 'activity', content: '📅 活动', className: 'group-activity' },
  { id: 'gacha', content: '🎴 卡池', className: 'group-gacha' },
  { id: 'welfare', content: '🎁 福利', className: 'group-welfare' },
]
function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/*活动条容器加载*/
function buildTemplate(item) {
  const safeContent = escapeHtml(item.content)
  if (item.image) {
    return `
      <div>
        <img src="${item.image}" height="74" onerror="this.style.display='none'" />
        <span>${safeContent}</span>
      </div>`
  }
  return `
    <div>
      <span>${safeContent}</span>
    </div>`
}

function formatTooltipDate(dateStr) {
  if (!dateStr) return ''
  if (dateStr.length <= 10) return dateStr
  const timePart = dateStr.slice(11, 16)
  if (timePart === '00:00') return dateStr.slice(0, 10)
  return dateStr.slice(0, 10) + ' ' + timePart
}

function formatItems(src, group) {
  return src.map((a) => {
    const startDate = a.start_date ? new Date(a.start_date.replace(' ', 'T') + ':00') : new Date()
    const endDate = a.end_date ? new Date(a.end_date.replace(' ', 'T') + ':00') : new Date()
    const base = {
      id: a.id,
      group,
      content: a.title,
      start: startDate,
      end: endDate,
      image: a.image || null,
      className: a.type === 'gacha' ? 'item-gacha' : a.type === 'welfare' ? 'item-welfare' : 'item-activity',
      title: `${a.title}\n${formatTooltipDate(a.start_date)} — ${formatTooltipDate(a.end_date)}${a.description ? '\n' + a.description : ''}`,
      color: a.color || null,
    }
    const hasColor = a.color && a.color !== '#409EFF'
    const bg = a.type === 'gacha' ? '#F56C6C' : a.type === 'welfare' ? '#E6A23C' : '#409EFF'
    const colorHex = hasColor ? a.color : bg
    base.style = `background-color:${colorHex}1a;border-color:${colorHex};`
    return base
  })
}

function assignFixedLanes(items) {
  const byGroup = {}
  for (const item of items) {
    if (!byGroup[item.group]) byGroup[item.group] = []
    byGroup[item.group].push(item)
  }

  const stats = {}

  for (const [group, groupItems] of Object.entries(byGroup)) {
    const sorted = [...groupItems].sort((a, b) =>
      new Date(a.start) - new Date(b.start) || a.id - b.id
    )
    const lanes = []

    for (const item of sorted) {
      let lane = 0
      for (; lane < lanes.length; lane++) {
        if (lanes[lane] < new Date(item.start)) {
          lanes[lane] = new Date(item.end)
          break
        }
      }
      if (lane === lanes.length) {
        lanes.push(new Date(item.end))
      }
      item.subgroup = String(lane)
    }

    stats[group] = lanes.length
  }

  return stats
}

function initTimeline(activities, gachas, welfares) {
  if (!timelineContainer.value) return

  const items = [
    ...formatItems(activities, 'activity'),
    ...formatItems(gachas, 'gacha'),
    ...formatItems(welfares, 'welfare'),
  ]

  const laneStats = assignFixedLanes(items)

  const allDates = items
    .flatMap((i) => [new Date(i.start), new Date(i.end)])
    .filter((d) => !isNaN(d))
  const minDate = allDates.length ? new Date(Math.min(...allDates)) : new Date()
  const maxDate = allDates.length ? new Date(Math.max(...allDates)) : new Date(Date.now() + 60 * 864e5)

  const pad = 7 * 864e5
  const startDate = new Date(minDate.getTime() - pad)
  const endDate = new Date(maxDate.getTime() + pad)

  const actCount = activities.length
  const gachaCount = gachas.length
  const welfareCount = welfares.length
  const actRows = Math.max(4, laneStats.activity || 0)//活动条高度
  const gachaRows = Math.max(3, laneStats.gacha || 0)//卡池条高度
  const welfareRows = Math.max(2, laneStats.welfare || 0)//福利条高度
  const calculatedHeight = (actRows + gachaRows + welfareRows) * 76 + 60

  const options = {
    start: startDate,
    end: endDate,
    height: calculatedHeight + 'px',
    minHeight: '820px',//决定日历表容器高度
    orientation: 'top',
    editable: false,
    selectable: true,
    multiselect: false,
    showCurrentTime: true,
    stack: false,
    stackSubgroups: true,
    verticalScroll: false,
    zoomMin: 864e5,
    zoomMax: 864e5 * 365,
    margin: { item: { horizontal: 6, vertical: 3 }, axis: 10 },
    template: buildTemplate,
    locale: 'en',
  }

  if (timeline) {
    timeline.setData({ items })
    timeline.setWindow(startDate, endDate, { animation: true })
    return
  }

  timeline = new Timeline(timelineContainer.value, items, groups, options)

  timeline.on('click', (props) => {
    if (props.item) {
      const found = [...activities, ...gachas, ...welfares].find((a) => a.id === props.item)
      if (found) {
        timeline.setSelection(found.id)
        emit('select-activity', found)
        trackEvent('activity_view', found.id)
        trackEvent('interaction')
      }
    }
  })

  timeline.on('doubleClick', (props) => {
    if (props.item) {
      const found = [...activities, ...gachas, ...welfares].find((a) => a.id === props.item)
      if (found) emit('select-activity', found)
    }
  })
}

async function loadActivities() {
  try {
    const { data } = await getActivities()
    initTimeline(data.activities || [], data.gachas || [], data.welfares || [])
  } catch {
    initTimeline([], [], [])
  }
}

onMounted(() => {
  loadActivities()
  window.addEventListener('resize', checkWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkWidth)
  if (timeline) { timeline.destroy(); timeline = null }
})
</script>

<style>
.rotate-hint {
  display: none;
  text-align: center;
  padding: 14px 20px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: #fff;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.35);
  animation: hintPulse 2.5s ease-in-out infinite;
}

.rotate-hint .arrow {
  display: inline-block;
  animation: arrowBounce 1s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { box-shadow: 0 2px 12px rgba(64, 158, 255, 0.35); }
  50%      { box-shadow: 0 4px 24px rgba(64, 158, 255, 0.6); }
}

@keyframes arrowBounce {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(6px); }
}

.timeline-container {
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 820px;
  background: #fff;
}

@media (max-width: 768px) {
  .rotate-hint {
    display: block;
  }
  .section-title {
    font-size: 16px;
  }
  .section-hint {
    display: block;
    font-size: 12px;
    margin-top: 4px;
  }
}

.vis-timeline { border: none !important; font-size: 13px; }

.vis-panel.vis-left {
  min-width: 94px;
  max-width: 120px;
}

.vis-panel.vis-center .vis-content > .vis-group:nth-child(1) {
  height: calc(4 / 9 * 100%) !important;
}
.vis-panel.vis-center .vis-content > .vis-group:nth-child(2) {
  height: calc(3 / 9 * 100%) !important;
}
.vis-panel.vis-center .vis-content > .vis-group:nth-child(3) {
  height: calc(2 / 9 * 100%) !important;
}
.vis-panel.vis-center .vis-content > .vis-group {
  overflow: hidden;
}

.vis-panel.vis-left .vis-label:nth-child(1) {
  height: calc(4 / 9 * 100%);
}
.vis-panel.vis-left .vis-label:nth-child(2) {
  height: calc(3 / 9 * 100%);
}
.vis-panel.vis-left .vis-label:nth-child(3) {
  height: calc(2 / 9 * 100%);
}
.vis-panel.vis-left .vis-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 12px;
}
.vis-panel.vis-left .vis-label:first-child { border-bottom: 1px solid #ebeef5; }

.group-activity .vis-label {
  background: linear-gradient(135deg, #ecf5ff, #d9ecff);
  color: #409EFF;
  border-right: 3px solid #409EFF;
}
.group-gacha .vis-label {
  background: linear-gradient(135deg, #fef0f0, #fde2e2);
  color: #F56C6C;
  border-right: 3px solid #F56C6C;
  border-top: 3px solid #909399;
}
.group-welfare .vis-label {
  background: linear-gradient(135deg, #fdf6ec, #faecd8);
  color: #E6A23C;
  border-right: 3px solid #E6A23C;
  border-top: 3px solid #909399;
}

.vis-panel.vis-left .vis-inner {
  display: none;
}

.vis-time-axis .vis-text {
  color: #606266;
  font-size: 12px;
  padding: 6px 0;
}
.vis-time-axis .vis-grid.vis-minor  { border-color: #f0f2f5; }
.vis-time-axis .vis-grid.vis-major  { border-color: #dcdfe6; }

.vis-current-time { background-color: #F56C6C; opacity: 0.6; pointer-events: none; }

.vis-item.vis-range {
  height: 76px !important;
  max-height: 76px !important;
  min-height: 76px !important;
  border-radius: 5px;
  cursor: pointer;
  transition: filter 0.15s, box-shadow 0.15s;
  overflow: hidden;
}
.vis-item.vis-range:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 5;
}
.vis-item.vis-range.vis-selected {
  border-color: #303133;
  z-index: 10;
}
.vis-item.vis-range .vis-item-content {
  padding: 0;
  height: 74px !important;
  line-height: 0 !important;
  display: block !important;
  overflow: hidden;
}

.item-activity.vis-range .vis-item {
  color: #303133;
}
.item-gacha.vis-range .vis-item {
  color: #303133;
}
.item-welfare.vis-range .vis-item {
  color: #303133;
}

.vis-item-content > div {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

/* 图片预览核心逻辑，非重大更新不建议修改 */
.vis-item-content > div:has(img) {
  justify-content: flex-start;
}

.vis-item-content > div:not(:has(img)) {
  justify-content: center;
  padding: 0 8px;
}

.vis-item-content img {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  object-fit: contain;
}

.vis-item-content span {
  line-height: 1.4 !important;
  vertical-align: middle !important;
  display: inline-block !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  padding: 0 6px;
}

.vis-tooltip {
  background: rgba(30,30,40,0.9) !important;
  color: #fff !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  white-space: pre-line !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
</style>
