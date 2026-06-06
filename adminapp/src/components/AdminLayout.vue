<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">🍪 Cookie Crumbs</div>
      <el-menu
        :default-active="activeRoute"
        background-color="#1d1e2c"
        text-color="#a0a3b1"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/activities">
          <el-icon><Calendar /></el-icon>
          <span>活动管理</span>
        </el-menu-item>
        <el-menu-item index="/feedbacks">
          <el-icon><Message /></el-icon>
          <span>反馈管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
        <el-menu-item index="/backup">
          <el-icon><FolderOpened /></el-icon>
          <span>数据库备份</span>
        </el-menu-item>
        <el-menu-item index="/messages">
          <el-icon><ChatLineSquare /></el-icon>
          <span>评论管理</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="admin-main">
      <header class="admin-header">
        <span class="admin-header-title">{{ pageTitle }}</span>
        <div class="admin-header-right">
          <span style="color:#606266;font-size:14px">{{ auth.user?.full_name }}</span>
          <el-button text type="danger" @click="handleLogout">退出</el-button>
        </div>
      </header>
      <div class="admin-body">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const activeRoute = computed(() => route.path)
const pageTitle = computed(() => route.meta.title || route.name || '管理后台')

function handleLogout() {
  auth.logout()
}
</script>
