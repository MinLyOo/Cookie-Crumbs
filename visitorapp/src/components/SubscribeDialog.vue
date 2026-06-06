<template>
  <el-dialog
    v-model="visible"
    title="📅 订阅日历"
    width="480px"
    destroy-on-close
    center
    class="subscribe-dialog"
  >
    <div class="subscribe-body">
      <el-radio-group v-model="selectedType" class="type-filter">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="activity">📅 活动</el-radio-button>
        <el-radio-button value="gacha">🎴 卡池</el-radio-button>
        <el-radio-button value="benefit">🎁 福利</el-radio-button>
      </el-radio-group>

      <div class="url-section">
        <el-input
          :model-value="icsUrl"
          readonly
          size="small"
        />
        <el-button type="primary" size="small" class="copy-btn" @click="handleCopy">
          复制链接
        </el-button>
      </div>

      <p class="instructions">
        打开手机/电脑日历 App → 添加订阅日历 → 粘贴以上链接
      </p>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedType = ref('')

const icsUrl = computed(() => {
  const base = window.location.origin + '/api/calendar.ics'
  return selectedType.value ? base + '?type=' + selectedType.value : base
})

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(icsUrl.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.subscribe-body {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-filter {
  display: flex;
  justify-content: center;
}

.url-section {
  display: flex;
  gap: 8px;
}

.url-section .el-input {
  flex: 1;
}

.copy-btn {
  flex-shrink: 0;
}

.instructions {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.7;
  text-align: center;
}
</style>

<style>
@media (max-width: 640px) {
  .subscribe-dialog {
    width: 100% !important;
    max-width: 100% !important;
    margin-top: 0 !important;
  }
  .subscribe-dialog .el-dialog__body {
    padding: 12px 16px;
  }
}
</style>
