#!/bin/bash

echo "=== HTTP 502 错误排查脚本 ==="

echo "1. 检查PM2服务详细状态:"
pm2 show nano-frontend-dev
echo ""
pm2 show nano-backend

echo ""
echo "2. 检查前端服务日志:"
echo "--- 最近20行前端日志 ---"
pm2 logs nano-frontend-dev --lines 20 --nostream

echo ""
echo "3. 检查端口占用情况:"
echo "检查5173端口:"
lsof -i :5173 2>/dev/null || echo "端口5173未被占用"

echo ""
echo "检查3001端口:"
lsof -i :3001 2>/dev/null || echo "端口3001未被占用"

echo ""
echo "4. 测试本地连接:"
echo "测试前端服务本地连接:"
curl -I http://localhost:5173 2>/dev/null || echo "❌ 前端服务本地无响应"

echo ""
echo "测试后端服务本地连接:"
curl -I http://localhost:3001/api/health 2>/dev/null || echo "❌ 后端服务本地无响应"

echo ""
echo "5. 检查防火墙状态:"
ufw status 2>/dev/null || echo "ufw未安装或未启用"

echo ""
echo "6. 检查网络监听详情:"
echo "IPv4监听情况:"
netstat -tlnp | grep -E ":(5173|3001)"

echo ""
echo "IPv6监听情况:"
netstat -tln6 | grep -E ":(5173|3001)"

echo ""
echo "=== 建议的修复步骤 ==="
echo "1. 如果前端服务状态异常，重启前端服务:"
echo "   pm2 restart nano-frontend-dev"
echo ""
echo "2. 如果端口未监听，检查vite配置:"
echo "   cat vite.config.ts"
echo ""
echo "3. 如果服务无法启动，手动测试vite启动:"
echo "   npm run dev"
echo ""
echo "4. 如果是权限问题，检查文件权限:"
echo "   ls -la"