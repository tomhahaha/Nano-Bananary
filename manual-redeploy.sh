#!/bin/bash

echo "=== 手动重新部署 Nano-Bananary ==="

# 服务器IP
SERVER_IP="39.101.165.84"

echo "目标服务器IP: $SERVER_IP"
echo ""

# 1. 完全停止所有相关服务
echo "1. 停止所有相关服务..."
pm2 delete all 2>/dev/null || true

# 强制杀掉可能占用端口的进程
echo "强制释放端口..."
sudo kill -9 $(sudo lsof -t -i:5173) 2>/dev/null || true
sudo kill -9 $(sudo lsof -t -i:3001) 2>/dev/null || true

sleep 3

echo ""
echo "2. 检查Node.js环境..."
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"

# 检查并重新安装依赖（如果需要）
echo ""
echo "3. 重新安装依赖..."
if [ "$EUID" -eq 0 ]; then
    npm install --unsafe-perm=true --allow-root
else
    npm install
fi

# 检查后端依赖
if [ -d "backend" ]; then
    echo "安装后端依赖..."
    cd backend
    if [ "$EUID" -eq 0 ]; then
        npm install --unsafe-perm=true --allow-root
    else
        npm install
    fi
    cd ..
fi

echo ""
echo "4. 验证Vite配置..."
# 确保vite.config.ts配置正确
if ! grep -q "host.*0.0.0.0" vite.config.ts; then
    echo "❌ Vite配置不正确，请检查vite.config.ts"
    echo "当前配置:"
    cat vite.config.ts
    echo ""
    echo "应该包含: host: '0.0.0.0'"
else
    echo "✓ Vite配置正确"
fi

echo ""
echo "5. 尝试不同的启动方式..."

echo ""
echo "方式1: 使用npm dev直接启动 (临时测试)"
echo "启动命令: npm run dev -- --host 0.0.0.0 --port 5173"

# 在后台启动前端服务进行测试
timeout 30 npm run dev -- --host 0.0.0.0 --port 5173 &
DEV_PID=$!

echo "等待服务启动..."
sleep 10

# 测试是否可以访问
echo "测试本地访问:"
if curl -s http://127.0.0.1:5173 > /dev/null; then
    echo "✓ 本地访问成功"
else
    echo "❌ 本地访问失败"
fi

# 杀掉测试进程
kill $DEV_PID 2>/dev/null

echo ""
echo "方式2: 构建生产版本并启动"

# 构建项目
echo "构建项目..."
if [ "$EUID" -eq 0 ]; then
    npm run build --unsafe-perm=true
else
    npm run build
fi

# 检查构建结果
if [ -d "dist" ]; then
    echo "✓ 构建成功，dist目录存在"
    ls -la dist/
else
    echo "❌ 构建失败，dist目录不存在"
    exit 1
fi

echo ""
echo "6. 使用PM2启动服务..."

# 启动后端服务
if [ -f "backend/test-server.js" ]; then
    echo "启动后端服务..."
    cd backend
    pm2 start test-server.js --name "nano-backend" -- --host 0.0.0.0
    cd ..
else
    echo "❌ 后端服务文件不存在"
fi

# 尝试多种前端启动方式
echo "启动前端服务..."

# 方式1: 使用serve
if command -v serve &> /dev/null; then
    echo "使用serve启动前端..."
    pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-frontend-serve"
fi

# 方式2: 使用npm dev (如果serve失败)
echo "使用npm dev启动前端（备用）..."
pm2 start "npm run dev -- --host 0.0.0.0 --port 5174" --name "nano-frontend-dev"

echo ""
echo "7. 等待服务完全启动..."
sleep 15

echo ""
echo "8. 详细测试连接..."

echo "PM2状态:"
pm2 status

echo ""
echo "端口监听状态:"
netstat -tlnp | grep -E ":(5173|5174|3001)"

echo ""
echo "测试连接:"

# 测试各种可能的连接方式
echo "测试127.0.0.1:5173:"
curl -s -m 5 -I http://127.0.0.1:5173 | head -3

echo ""
echo "测试127.0.0.1:5174:"
curl -s -m 5 -I http://127.0.0.1:5174 | head -3

echo ""
echo "测试localhost:5173:"
curl -s -m 5 -I http://localhost:5173 | head -3

echo ""
echo "测试内网IP:"
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "内网IP: $LOCAL_IP"
curl -s -m 5 -I http://$LOCAL_IP:5173 | head -3

echo ""
echo "9. 手动测试端口连通性..."

# 使用netcat测试端口
if command -v nc &> /dev/null; then
    echo "使用netcat测试端口连通性:"
    echo "测试5173端口:"
    timeout 3 nc -zv 127.0.0.1 5173 2>&1
    echo "测试3001端口:"
    timeout 3 nc -zv 127.0.0.1 3001 2>&1
fi

echo ""
echo "10. 创建简单的静态服务器测试..."

# 创建一个简单的测试页面
mkdir -p /tmp/test-server
cat > /tmp/test-server/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Port Test</title>
</head>
<body>
    <h1>Port 5175 Test Server</h1>
    <p>If you can see this, the server is working!</p>
    <p>Time: <span id="time"></span></p>
    <script>
        document.getElementById('time').textContent = new Date().toLocaleString();
    </script>
</body>
</html>
EOF

# 使用node启动简单HTTP服务器
cat > /tmp/test-server/server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
});

server.listen(5175, '0.0.0.0', () => {
    console.log('Test server running on port 5175');
});
EOF

echo "启动简单测试服务器在5175端口..."
cd /tmp/test-server
node server.js &
TEST_PID=$!
cd - > /dev/null

sleep 3

echo "测试简单服务器:"
curl -s http://127.0.0.1:5175 | head -5

echo ""
echo "从外部测试简单服务器 (如果可以访问，说明网络配置正常):"
echo "请在浏览器中访问: http://$SERVER_IP:5175"
echo "如果可以看到测试页面，说明网络连接正常，问题出在前端服务配置上"

# 清理测试服务器
sleep 10
kill $TEST_PID 2>/dev/null
rm -rf /tmp/test-server

echo ""
echo "=== 重新部署完成 ==="
echo ""
echo "🎯 尝试访问以下地址:"
echo "主要地址: http://$SERVER_IP:5173"
echo "备用地址: http://$SERVER_IP:5174"
echo ""
echo "📋 如果仍然无法访问，请检查:"
echo "1. PM2服务状态: pm2 status"
echo "2. 服务日志: pm2 logs"
echo "3. 端口监听: netstat -tlnp | grep 5173"
echo "4. 云服务商网络策略"
echo "5. 运营商网络限制"