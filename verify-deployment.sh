#!/bin/bash

# 部署后验证脚本
echo "=== 验证部署状态 ==="

echo "1. 检查PM2服务状态:"
pm2 status

echo ""
echo "2. 检查端口监听状态:"
echo "前端服务 (5173):"
netstat -tuln | grep 5173 || echo "❌ 端口5173未监听"

echo "后端服务 (3001):"
netstat -tuln | grep 3001 || echo "❌ 端口3001未监听"

echo ""
echo "3. 测试API连接:"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ 后端API响应正常"
else
    echo "❌ 后端API无响应"
fi

echo ""
echo "4. 访问地址:"
echo "前端: http://39.101.165.84:5173/"
echo "后端: http://39.101.165.84:3001/api/health"
echo ""
echo "注意: 如果是云服务器，请确保:"
echo "- 安全组已开放5173和3001端口"
echo "- 防火墙允许这些端口访问"

echo ""
echo "=== 验证完成 ==="