#!/bin/bash

# 服务器IP地址
SERVER_IP="39.101.165.84"

echo "=== Nano-Bananary 服务检查和修复 ==="
echo "目标服务器IP: $SERVER_IP"
echo ""

# 1. 检查当前服务状态
echo "1. 检查PM2服务状态..."
pm2 status

echo ""
echo "2. 检查端口监听状态..."
echo "检查5173端口 (前端):"
netstat -tlnp | grep :5173

echo "检查3001端口 (后端):"
netstat -tlnp | grep :3001

echo ""
echo "3. 测试本地服务连接..."

# 测试后端API
echo "测试后端API (localhost):"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✓ 后端API本地连接正常"
    curl -s http://localhost:3001/api/health
else
    echo "❌ 后端API本地连接失败"
fi

echo ""
echo "测试前端服务 (localhost):"
if curl -s -I http://localhost:5173 | head -n 1 | grep -q "200 OK"; then
    echo "✓ 前端服务本地连接正常"
else
    echo "❌ 前端服务本地连接失败"
fi

echo ""
echo "4. 测试外部访问..."

# 测试外部访问
echo "测试后端API (外部IP):"
if curl -s http://$SERVER_IP:3001/api/health > /dev/null; then
    echo "✓ 后端API外部访问正常"
    curl -s http://$SERVER_IP:3001/api/health
else
    echo "❌ 后端API外部访问失败"
fi

echo ""
echo "测试前端服务 (外部IP):"
if curl -s -I http://$SERVER_IP:5173 | head -n 1 | grep -q "200 OK"; then
    echo "✓ 前端服务外部访问正常"
else
    echo "❌ 前端服务外部访问失败"
fi

echo ""
echo "5. 检查防火墙配置..."
ufw status | grep -E "(5173|3001)"

echo ""
echo "6. 检查Vite配置..."
if grep -q "host.*0.0.0.0" vite.config.ts; then
    echo "✓ Vite配置正确 (host: 0.0.0.0)"
else
    echo "❌ Vite配置可能有问题"
    echo "当前vite.config.ts内容:"
    cat vite.config.ts
fi

echo ""
echo "7. 如果服务无法外部访问，尝试修复..."

# 确保防火墙规则正确
if ! ufw status | grep -q "5173"; then
    echo "添加5173端口防火墙规则..."
    ufw allow 5173/tcp
fi

if ! ufw status | grep -q "3001"; then
    echo "添加3001端口防火墙规则..."
    ufw allow 3001/tcp
fi

# 重启服务以确保配置生效
echo ""
echo "8. 重启服务..."

echo "重启后端服务..."
pm2 restart nano-bananary-backend

echo "重启前端服务..."
pm2 restart nano-bananary-frontend

echo ""
echo "9. 等待服务启动..."
sleep 5

echo ""
echo "10. 最终测试结果..."

echo "=== 最终访问地址 ==="
echo "前端应用: http://$SERVER_IP:5173"
echo "后端API: http://$SERVER_IP:3001/api"

echo ""
echo "测试最终访问:"
echo "后端健康检查:"
curl -s http://$SERVER_IP:3001/api/health || echo "后端API访问失败"

echo ""
echo "前端服务状态:"
curl -s -I http://$SERVER_IP:5173 | head -n 1 || echo "前端服务访问失败"

echo ""
echo "=== 检查完成 ==="
echo ""
echo "如果外部访问仍然失败，可能的原因："
echo "1. 云服务器安全组未开放端口 (需要在云控制台配置)"
echo "2. 网络提供商阻止了端口访问"
echo "3. 服务器内部网络配置问题"
echo ""
echo "请在浏览器中访问: http://$SERVER_IP:5173"