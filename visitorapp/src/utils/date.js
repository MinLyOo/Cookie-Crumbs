/**
 * 解析数据库时间字符串为 Date 对象
 * 数据库存储的是 UTC 时间（CURRENT_TIMESTAMP），格式为 "YYYY-MM-DD HH:MM:SS"
 * 需要追加 Z 后缀，明确告知 JS 引擎这是 UTC 时间
 * 然后通过 getHours/getDate 等方法自动转换为本地时区显示
 */
function parseDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'Z')
  if (isNaN(d.getTime())) return null
  return d
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:MM
 */
export function formatDateTime(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 格式化相对时间（刚刚、分钟前、小时前等）
 */
export function formatRelativeTime(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return ''
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + '分钟前'
  if (hours < 24) return hours + '小时前'
  if (days < 30) return days + '天前'
  return formatDate(dateStr)
}
