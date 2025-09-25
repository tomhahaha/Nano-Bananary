#!/bin/bash

echo "=== 修复 HTTP 502 错误 ==="

echo "1. 停止所有相关PM2进程:"
pm2 delete nano-frontend-dev 2>/dev/null || true
pm2 delete nano-backend 2>/dev/null || true
pm2 delete frontend-service 2>/dev/null || true
pm2 delete backend-service 2>/dev/null || true

echo ""
echo "2. 清理PM2进程列表:"
pm2 kill
pm2 resurrect

echo ""
echo "3. 手动测试前端服务启动:"
echo "正在测试 npm run dev..."
timeout 10s npm run dev &
VITE_PID=$!
sleep 5

# 检查vite是否启动成功
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Vite开发服务器可以正常启动"
    kill $VITE_PID 2>/dev/null
else
    echo "❌ Vite开发服务器启动失败"
    kill $VITE_PID 2>/dev/null
fi

echo ""
echo "4. 使用简化的PM2配置重新启动:"

# 直接启动后端
echo "启动后端服务..."
pm2 start backend/test-server.js --name "nano-backend"

sleep 3

# 直接启动前端，设置环境变量
echo "启动前端服务..."
pm2 start "npm run dev" --name "nano-frontend-dev" --cwd "./" \
    --log "./logs/frontend.log" \
    --error "./logs/frontend-error.log" \
    --out "./logs/frontend-out.log"

echo ""
echo "5. 等待服务启动..."
sleep 10

echo ""
echo "6. 验证服务状态:"
pm2 status

echo ""
echo "7. 检查端口监听:"
netstat -tuln | grep -E ":(5173|3001)"

echo ""
echo "8. 测试本地连接:"
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ 前端服务本地访问正常"
else
    echo "❌ 前端服务本地访问失败"
    echo "查看前端日志:"
    pm2 logs nano-frontend-dev --lines 10 --nostream
fi

if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ 后端服务本地访问正常"
else
    echo "❌ 后端服务本地访问失败"
fi

echo ""
echo "=== 修复完成 ==="
echo "如果服务正常启动，请尝试访问: http://39.101.165.84:5173/"