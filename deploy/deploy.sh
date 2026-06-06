#!/bin/bash
# Cookie Crumbs 一键部署脚本
# 使用方法: chmod +x deploy/deploy.sh && bash deploy/deploy.sh
set -e

echo "🍪 Cookie Crumbs 部署脚本"
echo "========================="

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_ROOT="/var/www/cookiecrumbs"
API_ROOT="$PROJECT_ROOT/calendarapi"
VISITOR_ROOT="$PROJECT_ROOT/visitorapp"
ADMIN_ROOT="$PROJECT_ROOT/adminapp"

echo ""
echo "[1/6] 安装后端依赖..."
cd "$API_ROOT"
npm ci --production

echo ""
echo "[2/6] 构建访客端..."
cd "$VISITOR_ROOT"
npm ci
npx vite build

echo ""
echo "[3/6] 构建管理端..."
cd "$ADMIN_ROOT"
npm ci
npx vite build

echo ""
echo "[4/6] 部署静态文件..."
sudo mkdir -p "$DEPLOY_ROOT/visitorapp" "$DEPLOY_ROOT/adminapp"
sudo cp -r "$VISITOR_ROOT/dist/"* "$DEPLOY_ROOT/visitorapp/"
sudo cp -r "$ADMIN_ROOT/dist/"* "$DEPLOY_ROOT/adminapp/"

mkdir -p "$API_ROOT/public/uploads"

echo ""
echo "[5/6] 初始化配置与数据库..."
cd "$API_ROOT"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "> 已创建 .env 文件，请编辑其中的 JWT_SECRET 和密码"
else
  echo "> .env 文件已存在，跳过创建"
fi
node seed.js

echo ""
echo "[6/6] 启动/重载 PM2 服务..."
cd "$PROJECT_ROOT"
mkdir -p logs
if pm2 list | grep -q cookiecrumbs-api; then
  pm2 reload deploy/ecosystem.config.js --only cookiecrumbs-api
  echo "> 服务已重载"
else
  pm2 start deploy/ecosystem.config.js --only cookiecrumbs-api
  pm2 save
  pm2 startup | tail -1 | bash 2>/dev/null || true
  echo "> 服务已启动，已配置开机自启"
fi

echo ""
echo "========================="
echo "✅ 部署完成！"
echo ""
echo "📌 访问地址:"
echo "   访客端: http://<服务器IP>"
echo "   管理端: http://<服务器IP>:8080"
echo ""
echo "📋 常用命令:"
echo "   查看状态: pm2 status"
echo "   查看日志: pm2 logs cookiecrumbs-api"
echo "   重启服务: pm2 restart cookiecrumbs-api"
echo "   停止服务: pm2 stop cookiecrumbs-api"
echo ""
echo "⚠️  请确保已修改 $API_ROOT/.env 中的敏感配置！"
echo "⚠️  请将 deploy/nginx.conf 配置到 Nginx 并重载！"
