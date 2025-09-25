#!/bin/bash

echo "=== Nano-Bananary 部署问题诊断脚本 ==="

# 1. 检查PM2进程状态
echo "1. 检查PM2进程状态:"
pm2 status

echo ""
echo "2. 检查端口占用情况:"
echo "前端端口 5173:"
netstat -tlnp | grep :5173 || echo "端口5173未被占用"

echo "后端端口 3001:"
netstat -tlnp | grep :3001 || echo "端口3001未被占用"

echo ""
echo "3. 检查防火墙状态:"
ufw status

echo ""
echo "4. 检查后端API健康状态:"
echo "本地测试:"
curl -s http://localhost:3001/api/health || echo "本地API访问失败"

echo ""
echo "通过服务器IP测试:"
SERVER_IP=$(hostname -I | awk '{print $1}')
curl -s http://$SERVER_IP:3001/api/health || echo "通过IP访问API失败"

echo ""
echo "5. 检查PM2日志 (最近20行):"
echo "后端日志:"
pm2 logs nano-bananary-backend --lines 20 --nostream 2>/dev/null || echo "无后端日志"

echo ""
echo "前端日志:"
pm2 logs nano-bananary-frontend --lines 20 --nostream 2>/dev/null || echo "无前端日志"

echo ""
echo "6. 检查环境配置:"
if [ -f ".env.local" ]; then
    echo ".env.local 文件存在"
    echo "GEMINI_API_KEY配置: $(grep GEMINI_API_KEY .env.local | head -c 30)..."
else
    echo ".env.local 文件不存在"
fi

echo ""
echo "7. 检查服务器网络信息:"
echo "服务器IP地址:"
hostname -I

echo ""
echo "8. 测试前端访问:"
echo "前端服务访问测试:"
curl -s -I http://localhost:5173 | head -n 1 || echo "前端服务无响应"

echo ""
echo "=== 诊断完成 ==="
echo "请将以上输出发送给技术支持以便进一步分析问题"