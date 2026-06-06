<template>
  <div class="feedback-fab">
    <el-tooltip content="提交反馈" placement="left">
      <el-button
        type="primary"
        size="large"
        circle
        class="fab-button"
        @click="visible = true"
      >
        ✉
      </el-button>
    </el-tooltip>

    <el-dialog
      v-model="visible"
      title="✉ 提交反馈"
      width="480px"
      destroy-on-close
      center
    >
      <el-form :model="form" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="可选：简单概括你的建议" maxlength="100" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="请描述你的建议或问题..."
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.contact" placeholder="可选：留下联系方式方便我们回复" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :disabled="!form.content.trim()" :loading="submitting" @click="handleSubmit">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { submitFeedback, trackEvent } from '../utils/api'

const visible = ref(false)
const submitting = ref(false)
const form = reactive({
  title: '',
  content: '',
  contact: '',
})

watch(visible, (val) => {
  if (val) trackEvent('interaction')
})

async function handleSubmit() {
  if (!form.content.trim()) return
  submitting.value = true
  try {
    await submitFeedback({
      title: form.title,
      content: form.content,
      contact: form.contact,
    })
    ElMessage.success('感谢你的反馈！')
    visible.value = false
    form.title = ''
    form.content = ''
    form.contact = ''
    trackEvent('interaction')
  } catch (err) {
    const msg = err.response?.data?.error || '提交失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.feedback-fab {
  position: fixed;
  bottom: 48px;
  right: 48px;
  z-index: 1000;
}

.fab-button {
  width: 52px;
  height: 52px;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}
</style>
