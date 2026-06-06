<template>
  <div class="about-page">
    <div class="about-content" v-html="markdownContent"></div>
    <div class="back-fab">
      <el-tooltip content="返回" placement="left">
        <el-button
          type="primary"
          size="large"
          circle
          class="fab-button"
          @click="$emit('back')"
        >
          ←
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineEmits(['back'])

const markdownContent = ref('')

async function loadMarkdown() {
  try {
    const response = await fetch('/docs/about.md')
    const text = await response.text()
    markdownContent.value = parseMarkdown(text)
  } catch (err) {
    markdownContent.value = '<p>加载文档失败</p>'
  }
}

function parseMarkdown(text) {
  let html = text
    // 安全：移除危险标签
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+=["'].*?["']/gi, '')
    .replace(/on\w+=\S+/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')

    // 代码块（先处理，防止内部语法被后续规则干扰）
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // 标题
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // 图片（方括号在前，先于链接处理）
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px">')

    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')

    // 粗体 + 斜体
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')

    // 删除线
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')

    // 水平分割线
    .replace(/^---$/gim, '<hr>')

    // 引用（单行和段落）
    .replace(/^> (.*$)/gim, '<blockquote><p>$1</p></blockquote>')

    // 无序列表
    .replace(/^[\-\*] (.*$)/gim, '<li>$1</li>')

    // 有序列表
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')

    // 换行
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')

  // 合并连续 <blockquote> 为同一个块
  html = html.replace(/(<\/blockquote>)\s*(<blockquote>)/g, '\n')
  // 包裹连续 <li>
  html = html.replace(/(<li>.*?<\/li>)+/gim, (match) => {
    return `<ul>${match}</ul>`
  })

  return html
}

onMounted(loadMarkdown)
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 32px 0 120px 0;
  box-sizing: border-box;
}

.back-fab {
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

.about-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  min-height: calc(100vh - 64px);
  box-sizing: border-box;
}

.about-content h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 32px;
  color: #2c3e50;
  border-bottom: 3px solid #409EFF;
  padding-bottom: 16px;
  position: relative;
}

.about-content h1::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.about-content h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 28px 0 16px;
  color: #2c3e50;
  position: relative;
  padding-left: 20px;
}

.about-content h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, #409EFF 0%, #67c23a 100%);
  border-radius: 2px;
}

.about-content h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 20px 0 12px;
  color: #5a6268;
  padding-left: 16px;
}

.about-content p {
  margin: 12px 0;
  line-height: 2;
  color: #606266;
  font-size: 15px;
  text-align: justify;
}

.about-content ul {
  margin: 12px 0 12px 28px;
  padding: 0;
}

.about-content li {
  margin: 8px 0;
  line-height: 2;
  color: #606266;
  font-size: 15px;
  position: relative;
  padding-left: 12px;
}

.about-content li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: #409EFF;
  font-size: 14px;
}

.about-content a {
  color: #409EFF;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 1px solid transparent;
}

.about-content a:hover {
  color: #67c23a;
  border-bottom-color: #67c23a;
}

.about-content strong {
  font-weight: 600;
  color: #2c3e50;
}

.about-content em {
  font-style: italic;
  color: #859099;
}

.about-content del {
  text-decoration: line-through;
  color: #c0c4cc;
}

.about-content code {
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 14px;
  color: #E6A23C;
}

.about-content pre {
  background: #1d1e2c;
  padding: 16px 20px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.about-content pre code {
  background: none;
  color: #a0a3b1;
  padding: 0;
  font-size: 13px;
  line-height: 1.7;
}

.about-content blockquote {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid #409EFF;
  background: #f5f7fa;
  border-radius: 0 8px 8px 0;
}

.about-content blockquote p {
  margin: 0;
  color: #606266;
}

.about-content hr {
  border: none;
  border-top: 1px solid #e4e7ed;
  margin: 28px 0;
}

.about-content img {
  display: block;
  margin: 16px auto;
}

.about-content h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 18px 0 10px;
  color: #7a828a;
}
</style>
