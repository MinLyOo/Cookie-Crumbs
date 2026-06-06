const { spawn, execSync } = require('child_process')
const readline = require('readline')
const path = require('path')
const net = require('net')

const ROOT = __dirname
const processes = []
const colors = { api: '\x1b[36m', visitor: '\x1b[32m', admin: '\x1b[35m', ui: '\x1b[33m', reset: '\x1b[0m', dim: '\x1b[90m', red: '\x1b[31m' }

function label(name) {
  return colors[name || 'ui'] + `[${name}]` + colors.reset
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    let done = false
    server.once('error', (err) => { if (!done) { done = true; resolve(err.code === 'EADDRINUSE') } })
    server.once('listening', () => { if (!done) { done = true; server.close(); resolve(false) } })
    server.listen(port, '0.0.0.0')
  })
}

function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
    const myPid = String(process.pid)
    const pids = new Set()
    for (const line of result.trim().split('\n')) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid) && pid !== myPid) pids.add(pid)
    }
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid}`, { stdio: 'ignore' }) } catch {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }) } catch {}
      }
    }
  } catch {}
}

async function freePort(port, name) {
  if (await checkPort(port)) {
    process.stdout.write(`${label('ui')} ⚠️  端口 ${port} 被占用，正在释放...\n`)
    killPort(port)
    await new Promise((r) => setTimeout(r, 800))
    if (await checkPort(port)) {
      process.stdout.write(`${label('ui')} ${colors.red}端口 ${port} 释放失败${colors.reset}\n`)
      return false
    }
  }
  return true
}

function spawnProcess(name, cwd, cmd, args) {
  const child = spawn(cmd, args, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdout.on('data', (d) => {
    for (const line of d.toString().split('\n').filter(Boolean))
      process.stdout.write(`${label(name)} ${colors.dim}${line}${colors.reset}\n`)
  })
  child.stderr.on('data', (d) => {
    for (const line of d.toString().split('\n').filter(Boolean))
      process.stdout.write(`${label(name)} ${colors.red}${line}${colors.reset}\n`)
  })
  child.on('close', (code) => {
    process.stdout.write(`${label('ui')} ${colors.red}${name} 进程退出 (code=${code})${colors.reset}\n`)
  })
  return child
}

function startApi() {
  process.stdout.write(`${label('ui')} 🚀 启动后端 API...\n`)
  const child = spawnProcess('api', path.join(ROOT, 'calendarapi'), 'node', ['index.js'])
  processes[0] = child; return child
}
function startVisitor() {
  process.stdout.write(`${label('ui')} 🚀 启动访客端...\n`)
  const child = spawnProcess('visitor', path.join(ROOT, 'visitorapp'), 'npx', ['vite'])
  processes[1] = child; return child
}
function startAdmin() {
  process.stdout.write(`${label('ui')} 🚀 启动管理端...\n`)
  const child = spawnProcess('admin', path.join(ROOT, 'adminapp'), 'npx', ['vite'])
  processes[2] = child; return child
}
function restartApi() {
  if (processes[0]) {
    processes[0].kill('SIGTERM')
    setTimeout(() => { if (processes[0] && !processes[0].killed) processes[0].kill('SIGKILL'); startApi() }, 1000)
  } else startApi()
}
function killAll() {
  for (const p of processes) { if (p && !p.killed) p.kill('SIGTERM') }
  setTimeout(() => { for (const p of processes) { if (p && !p.killed) p.kill('SIGKILL') } }, 500)
}
process.on('SIGINT', () => { process.stdout.write(`\n${label('ui')} 正在关闭...\n`); killAll() })
process.on('SIGTERM', () => { killAll(); process.exit(0) })

async function main() {
  console.clear()
  console.log(`\n${colors.dim}╔══════════════════════════════════════════════╗\n║                                              ║\n║      🍪  Cookie Crumbs Dev Manager           ║\n║                                              ║\n║   ${colors.api}${'[后端]'.padEnd(12)} ${'http://localhost:30001'}${colors.dim}      ║\n║   ${colors.visitor}${'[访客端]'.padEnd(10)} ${'http://localhost:51731'}${colors.dim}       ║\n║   ${colors.admin}${'[管理端]'.padEnd(10)} ${'http://localhost:51741'}${colors.dim}       ║\n║                                              ║\n║   命令: r = 重启后端 | q = 全部退出          ║\n║                                              ║\n╚══════════════════════════════════════════════╝\n${colors.reset}`)
  process.stdout.write(`${label('ui')} 🔍 检查端口占用...\n`)
  await freePort(30001, 'api'); await freePort(51731, 'visitor'); await freePort(51741, 'admin')
  process.stdout.write('\n')
  startApi()
  setTimeout(() => { startVisitor(); startAdmin() }, 2000)
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { process.stdout.write(`\n${label('ui')} 正在关闭...\n`); killAll(); return }
    if (key.name === 'r') restartApi()
    if (key.name === 'q') { process.stdout.write(`\n${label('ui')} 正在关闭...\n`); killAll() }
  })
  process.stdout.write(`${label('ui')} 按 ${colors.api}r${colors.reset}${colors.dim} 重启后端 │ 按 ${colors.red}q${colors.reset}${colors.dim} 全部退出\n${colors.reset}`)
}
main()
