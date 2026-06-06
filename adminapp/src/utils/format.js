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

export function formatDateTime(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDate(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatActivityDate(dateStr) {
  if (!dateStr) return ''
  if (dateStr.length <= 10) return dateStr
  const datePart = dateStr.slice(0, 10)
  const timePart = dateStr.slice(11, 16)
  if (timePart === '00:00') return datePart
  return datePart + ' ' + timePart
}

export const statusMap = { 0: '未读', 1: '已读', 2: '已处理' }
export const statusColors = { 0: 'danger', 1: 'warning', 2: 'success' }
