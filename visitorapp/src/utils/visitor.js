const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateId() {
  const len = Math.random() < 0.5 ? 4 : 5
  let id = ''
  for (let i = 0; i < len; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return id
}

export function getVisitorId() {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = generateId()
    localStorage.setItem('visitor_id', id)
  }
  return id
}

export function getDisplayName() {
  const id = getVisitorId()
  return '博士#' + id.slice(-4)
}
