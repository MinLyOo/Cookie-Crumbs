# Cookie Crumbs

游戏活动日历展示平台 — 以可视化时间轴展示游戏活动，搭配简单的互动系统，让玩家不错过每一个精彩活动。

[![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.6-409EFF?logo=element)](https://element-plus.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 项目简介

Cookie Crumbs 是一个基于 Vue 3 + Express 的全栈游戏活动日历应用。它以 vis-timeline 甘特图直观展示活动时间线，支持三种活动类型（常规活动 / 卡池 / 福利），访客可以通过表情表态和拼词留言参与互动。

项目包含三个独立模块：访客端、管理端和后端 API，全部使用 JavaScript 编写。

## 功能特性

- **访客端** — 活动日历甘特图、表情表态、拼词留言、ICS 日历订阅
- **管理端** — 活动管理、仪表盘统计、反馈管理、数据库备份

## 技术栈

| 层 | 目录 | 核心技术 |
|----|------|---------|
| 访客端 | `visitorapp/` | Vue 3 + Vite 5 + Element Plus + vis-timeline |
| 管理端 | `adminapp/` | Vue 3 + Vite 5 + Element Plus + Vue Router + Pinia + ECharts |
| 后端 API | `calendarapi/` | Express + better-sqlite3 + JWT + bcrypt + sharp + multer |

## 项目结构

```
Cookie Crumbs/
├── visitorapp/                 # 访客端（Vue 3 SPA）
│   ├── src/
│   │   ├── components/         # SiteHeader, CalendarBoard, ActivityDetailDialog 等
│   │   └── utils/              # API 封装, 日期工具, 访客 ID 管理
│   └── vite.config.js
│
├── adminapp/                   # 管理端（Vue 3 SPA）
│   ├── src/
│   │   ├── views/              # Dashboard, ActivityManage, MessageManage 等
│   │   ├── stores/auth.js      # Pinia 认证 + JWT 管理
│   │   ├── router/             # 路由守卫
│   │   └── utils/              # API 封装, 格式化工具
│   └── vite.config.js
│
├── calendarapi/                # 后端 API（Express）
│   ├── controllers/            # 业务控制器
│   ├── routes/                 # 路由模块
│   ├── middleware/             # JWT 认证 / 可选认证 / 备份密钥
│   ├── utils/                  # 备份工具 / ICS 生成
│   ├── db.js                   # 数据库初始化 + 迁移
│   ├── seed.js                 # 管理员创建 + 词库预置
│   └── index.js                # Express 入口
│
├── deploy/                     # 部署参考配置
│   ├── nginx.conf              # Nginx 反向代理配置模板
│   ├── ecosystem.config.js     # PM2 进程管理配置
│   └── deploy.sh               # 一键部署脚本
│
├── dev.js                      # 一键启动开发环境
└── package.json                # 根工作区脚本
```

## 快速开始

**环境要求：Node.js >= 18**

```bash
# 1. 安装所有依赖
cd calendarapi && npm install
cd ../visitorapp && npm install
cd ../adminapp && npm install
cd ..

# 2. 配置环境变量
cp calendarapi/.env.example calendarapi/.env
# 编辑 calendarapi/.env，按需修改配置

# 3. 初始化数据库
cd calendarapi && node seed.js && cd ..

# 4. 启动开发服务器
node dev.js
#或者 
npm run dev       # 一键启动 API + 访客端 + 管理端
```

`dev.js` 会自动启动三个服务，并检查释放端口占用：

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:30001 |
| 访客端 | http://localhost:51731 |
| 管理端 | http://localhost:51741 |

**默认管理员账号：** 用户名 `admin`，密码 `admin123`（见 `.env.example`）。

> 公网部署时建议修改`.env`中的环境变量，比如`JWT_SECRET`、`ADMIN_PASSWORD` 和 `BACKUP_SECRET_KEY`等。

## 生产构建

```bash
cd visitorapp && npm run build    # 输出 → visitorapp/dist/
cd adminapp && npm run build      # 输出 → adminapp/dist/
```

构建产物为纯静态文件，配合 Nginx 反向代理部署。后端使用 PM2 或 systemd 守护进程。可参考 `deploy/` 目录中的配置模板。

## 环境变量

| 变量 | 说明 | 开发默认值 |
|------|------|-----------|
| `PORT` | API 服务端口 | `30001` |
| `JWT_SECRET` | 登录令牌签名密钥 | 见 `.env.example` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |
| `BACKUP_SECRET_KEY` | 备份操作验证密钥 | 见 `.env.example` |
| `TZ` | 服务器时区 | `Asia/Shanghai` |

## API 概览

| 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/auth/login` | POST | 无 | 管理员登录 |
| `/api/activities` | GET | 否 | 获取活动列表（支持类型/日期筛选） |
| `/api/activities` | POST | JWT | 创建活动 |
| `/api/activities/:id` | PUT | JWT | 更新活动 |
| `/api/activities/:id` | DELETE | JWT | 删除活动（软删除） |
| `/api/activities/:id/reactions` | GET/POST | 否 | 获取/切换表情表态 |
| `/api/activities/:id/messages` | GET/POST | 否 | 获取/创建拼词留言 |
| `/api/messages/:id/like` | POST | 否 | 切换留言点赞 |
| `/api/feedbacks` | GET/POST | 混合 | 提交/管理反馈 |
| `/api/analytics/stats` | GET | JWT | 仪表盘统计数据 |
| `/api/analytics/track` | POST | 否 | 前端埋点上报 |
| `/api/calendar.ics` | GET | 否 | ICS 日历订阅 |
| `/api/backup` | GET/POST | JWT+密钥 | 数据库备份管理 |

## 许可证

[MIT](LICENSE) © 2026 MinLyOo
