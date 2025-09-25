#!/bin/bash

echo "=== 深度故障排查 - 服务器IP: 39.101.165.84 ==="

# 1. 检查服务进程详细状态
echo "1. PM2详细状态检查:"
pm2 status
echo ""
pm2 info nano-bananary-frontend
echo ""
pm2 info nano-bananary-backend

echo ""
echo "2. 检查端口详细监听状态:"
echo "所有监听端口:"
netstat -tlnp | grep LISTEN

echo ""
echo "具体检查5173和3001端口:"
ss -tlnp | grep :5173
ss -tlnp | grep :3001

echo ""
echo "3. 检查进程是否真正运行:"
ps aux | grep -E "(node|serve|npm)" | grep -v grep

echo ""
echo "4. 检查网络接口配置:"
ip addr show

echo ""
echo "5. 检查路由表:"
ip route show

echo ""
echo "6. 测试本地回环连接:"
echo "测试127.0.0.1:5173:"
timeout 10 curl -v http://127.0.0.1:5173 2>&1 | head -20

echo ""
echo "测试localhost:5173:"
timeout 10 curl -v http://localhost:5173 2>&1 | head -20

echo ""
echo "7. 测试内网IP连接:"
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "内网IP: $LOCAL_IP"
timeout 10 curl -v http://$LOCAL_IP:5173 2>&1 | head -20

echo ""
echo "8. 检查系统资源:"
echo "内存使用:"
free -h

echo ""
echo "磁盘使用:"
df -h

echo ""
echo "CPU负载:"
uptime

echo ""
echo "9. 检查系统日志中的错误:"
echo "最近的系统错误:"
journalctl -n 50 --no-pager | grep -i error

echo ""
echo "10. 检查PM2日志:"
echo "前端服务日志:"
pm2 logs nano-bananary-frontend --lines 20 --nostream 2>/dev/null

echo ""
echo "后端服务日志:"
pm2 logs nano-bananary-backend --lines 20 --nostream 2>/dev/null

echo ""
echo "11. 检查Vite配置文件:"
if [ -f "vite.config.ts" ]; then
    echo "vite.config.ts内容:"
    cat vite.config.ts
else
    echo "vite.config.ts文件不存在"
fi

echo ""
echo "12. 检查package.json脚本:"
if [ -f "package.json" ]; then
    echo "package.json中的scripts:"
    grep -A 10 '"scripts"' package.json
else
    echo "package.json文件不存在"
fi

echo ""
echo "13. 检查防火墙详细状态:"
ufw status verbose

echo ""
echo "14. 检查iptables规则:"
iptables -L -n

echo ""
echo "15. 检查是否有其他服务占用端口:"
lsof -i :5173 2>/dev/null || echo "端口5173未被占用"
lsof -i :3001 2>/dev/null || echo "端口3001未被占用"

echo ""
echo "16. 手动启动测试:"
echo "尝试手动启动简单HTTP服务器进行测试..."

# 创建一个简单的测试HTML文件
cat > test.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Test Server</title></head>
<body><h1>Test Server Running on Port 5173</h1></body>
</html>
EOF

# 尝试用Python启动简单服务器
if command -v python3 &> /dev/null; then
    echo "使用Python启动测试服务器..."
    timeout 5 python3 -m http.server 5174 --bind 0.0.0.0 &
    PYTHON_PID=$!
    sleep 2
    
    echo "测试Python服务器:"
    curl -s http://127.0.0.1:5174/test.html | head -5
    
    # 清理
    kill $PYTHON_PID 2>/dev/null
    rm -f test.html
fi

echo ""
echo "17. 检查系统网络配置:"
echo "DNS配置:"
cat /etc/resolv.conf

echo ""
echo "Hosts文件:"
grep -v "^#" /etc/hosts | grep -v "^$"

echo ""
echo "18. 检查selinux状态 (如果存在):"
if command -v sestatus &> /dev/null; then
    sestatus
else
    echo "SELinux未安装"
fi

echo ""
echo "19. 最终建议:"
echo "基于以上检查结果，可能的问题:"
echo "1. PM2进程未正确启动"
echo "2. Vite配置host设置错误"
echo "3. 系统资源不足"
echo "4. 网络接口配置问题"
echo "5. 其他安全软件阻止"
echo ""
echo "=== 排查完成 ==="