import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../components/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'activities', name: 'Activities', component: () => import('../views/ActivityManage.vue') },
      { path: 'feedbacks', name: 'Feedbacks', component: () => import('../views/FeedbackManage.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/SettingsView.vue') },
      { path: 'backup', name: 'Backup', component: () => import('../views/DatabaseBackup.vue') },
      { path: 'messages', name: 'Messages', component: () => import('../views/MessageManage.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next('/login')
  }
  if (to.meta.guest && authStore.isLoggedIn) {
    return next('/')
  }
  next()
})

export default router
