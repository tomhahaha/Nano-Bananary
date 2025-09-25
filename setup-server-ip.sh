#!/bin/bash

# 配置正确的服务器IP访问
SERVER_IP="39.101.165.84"

echo "=== 配置服务器IP访问: $SERVER_IP ==="

echo "1. 检查并更新防火墙规则..."

# 确保防火墙允许访问
ufw allow 5173/tcp comment "Nano-Bananary Frontend"
ufw allow 3001/tcp comment "Nano-Bananary Backend"

echo "当前防火墙状态:"
ufw status

echo ""
echo "2. 验证Vite配置..."

# 检查vite.config.ts是否正确配置
if ! grep -q "host.*0.0.0.0" vite.config.ts; then
    echo "❌ Vite配置需要更新"
    echo "请确保vite.config.ts包含以下配置:"
    echo "server: { host: '0.0.0.0', port: 5173 }"
else
    echo "✓ Vite配置正确"
fi

echo ""
echo "3. 重新构建前端 (应用最新配置)..."
npm run build

echo ""
echo "4. 重启所有服务..."

# 停止现有服务
pm2 stop all

# 确保端口释放
sleep 3

# 重新启动后端服务
echo "启动后端服务..."
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

# 重新启动前端服务 (生产模式)
echo "启动前端服务..."
pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"

echo ""
echo "5. 等待服务启动..."
sleep 10

echo ""
echo "6. 测试服务访问..."

echo "测试后端API:"
if curl -s -m 10 http://$SERVER_IP:3001/api/health; then
    echo ""
    echo "✓ 后端API访问正常"
else
    echo "❌ 后端API访问失败"
fi

echo ""
echo "测试前端服务:"
if curl -s -m 10 -I http://$SERVER_IP:5173 | head -n 1; then
    echo "✓ 前端服务访问正常"
else
    echo "❌ 前端服务访问失败"
fi

echo ""
echo "7. 检查PM2状态..."
pm2 status

echo ""
echo "=== 配置完成 ==="
echo ""
echo "🎯 您的访问地址:"
echo "前端应用: http://$SERVER_IP:5173"
echo "后端API:  http://$SERVER_IP:3001/api"
echo ""
echo "📋 如果仍无法访问，请检查:"
echo "1. 云服务器安全组是否开放了5173和3001端口"
echo "2. 网络运营商是否阻止了这些端口"
echo "3. 服务器是否有其他防火墙软件"
echo ""
echo "🔧 常用调试命令:"
echo "查看服务状态: pm2 status"
echo "查看服务日志: pm2 logs"
echo "查看端口占用: netstat -tlnp | grep -E '(5173|3001)'"
echo "测试本地连接: curl http://localhost:5173"