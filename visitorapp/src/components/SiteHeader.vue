<template>
  <header class="site-header">
    <div class="header-content">
      <div class="logo-area">
        <span class="logo-icon">🍪</span>
        <div class="logo-text">
          <h1 class="site-name">Cookie Crumbs</h1>
          <p class="site-tagline">游戏活动日历 — 不错过每一个精彩活动</p>
        </div>
      </div>
      <p class="site-desc">
        在这里您可以查看游戏的所有限时活动安排，订阅日历接收最新动态，
        还可以提交反馈帮助我们做得更好。
      </p>
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
.site-header {
  padding: 40px 0 32px;
}

.header-content {
  text-align: center;
}

.logo-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 48px;
  line-height: 1;
}

.logo-text {
  text-align: left;
}

.site-name {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.site-tagline {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.site-desc {
  font-size: 14px;
  color: #606266;
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .site-header {
    padding: 24px 16px 20px;
  }
  .logo-icon {
    font-size: 36px;
  }
  .site-name {
    font-size: 22px;
  }
  .site-tagline {
    font-size: 12px;
  }
  .site-desc {
    font-size: 13px;
  }
}
</style>
