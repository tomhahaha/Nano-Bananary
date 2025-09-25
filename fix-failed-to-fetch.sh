#!/bin/bash

echo "=== 修复 'Failed to fetch' 问题 ==="

# 1. 检查当前问题状态
echo "1. 运行诊断脚本..."
chmod +x debug-deployment.sh
./debug-deployment.sh

echo ""
echo "2. 检查和重启后端服务..."

# 停止现有的后端服务
pm2 stop nano-bananary-backend 2>/dev/null || true

# 检查3001端口是否被占用
if netstat -tlnp | grep :3001; then
    echo "端口3001被占用，尝试释放..."
    # 查找并杀掉占用3001端口的进程
    PID=$(netstat -tlnp | grep :3001 | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        sleep 2
    fi
fi

# 重新启动后端服务
echo "重新启动后端服务..."
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

echo ""
echo "3. 等待后端服务启动..."
sleep 5

# 测试后端API连接
echo "4. 测试后端API连接..."
for i in {1..10}; do
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo "✓ 后端API连接成功"
        break
    else
        echo "等待后端服务启动... ($i/10)"
        sleep 2
    fi
done

# 如果API仍然无法访问，尝试手动启动
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "⚠️ 后端API仍无法访问，尝试手动启动..."
    cd backend
    pm2 delete nano-bananary-backend 2>/dev/null || true
    
    # 检查test-server.js是否存在
    if [ -f "test-server.js" ]; then
        echo "启动test-server.js..."
        pm2 start test-server.js --name "nano-bananary-backend"
    else
        echo "❌ 未找到test-server.js文件"
        ls -la
    fi
    cd ..
fi

echo ""
echo "5. 重新构建前端..."

# 重新构建前端以应用API配置更改
npm run build

echo ""
echo "6. 重启前端服务..."

# 停止前端服务
pm2 stop nano-bananary-frontend 2>/dev/null || true

# 重启前端服务（使用构建后的版本）
pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"

echo ""
echo "7. 等待前端服务启动..."
sleep 3

echo ""
echo "8. 最终测试..."

# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "服务器IP: $SERVER_IP"
echo "测试后端API: http://$SERVER_IP:3001/api/health"
curl -s http://$SERVER_IP:3001/api/health

echo ""
echo "测试前端服务: http://$SERVER_IP:5173"
curl -s -I http://$SERVER_IP:5173 | head -n 1

echo ""
echo "9. 检查最终状态..."
pm2 status

echo ""
echo "=== 修复完成 ==="
echo "现在可以尝试访问: http://$SERVER_IP:5173"
echo ""
echo "如果问题仍然存在，请检查："
echo "1. 防火墙是否正确配置"
echo "2. 服务器网络是否允许外部访问"
echo "3. 浏览器控制台是否有其他错误信息"