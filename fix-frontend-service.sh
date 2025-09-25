#!/bin/bash

echo "=== 修复前端服务启动问题 ==="

# 1. 查看错误日志
echo "1. 查看前端服务错误日志..."
echo "nano-frontend-dev 日志:"
pm2 logs nano-frontend-dev --lines 20 --nostream 2>/dev/null

echo ""
echo "nano-frontend-serve 日志:"
pm2 logs nano-frontend-serve --lines 20 --nostream 2>/dev/null

echo ""
echo "2. 停止所有错误的前端服务..."
pm2 delete nano-frontend-dev 2>/dev/null || true
pm2 delete nano-frontend-serve 2>/dev/null || true

# 确保端口释放
echo "释放5173端口..."
sudo kill -9 $(sudo lsof -t -i:5173) 2>/dev/null || true
sleep 3

echo ""
echo "3. 检查项目构建状态..."
if [ ! -d "dist" ]; then
    echo "dist目录不存在，开始构建..."
    if [ "$EUID" -eq 0 ]; then
        npm run build --unsafe-perm=true
    else
        npm run build
    fi
else
    echo "✓ dist目录存在"
    echo "dist目录内容:"
    ls -la dist/
fi

echo ""
echo "4. 验证Vite配置..."
if grep -q "host.*0.0.0.0" vite.config.ts; then
    echo "✓ Vite配置正确"
else
    echo "❌ Vite配置需要检查"
    echo "当前vite.config.ts:"
    cat vite.config.ts
fi

echo ""
echo "5. 检查package.json脚本..."
echo "可用的scripts:"
grep -A 10 '"scripts"' package.json

echo ""
echo "6. 尝试不同的启动方式..."

# 方式1: 直接使用serve启动构建后的文件
if command -v serve &> /dev/null && [ -d "dist" ]; then
    echo "方式1: 使用serve启动构建版本..."
    pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-frontend"
    sleep 5
    
    # 检查是否启动成功
    if pm2 status | grep "nano-frontend" | grep -q "online"; then
        echo "✓ serve方式启动成功"
    else
        echo "❌ serve方式启动失败"
        pm2 delete nano-frontend 2>/dev/null || true
    fi
fi

# 方式2: 如果serve失败，尝试开发模式
if ! pm2 status | grep "nano-frontend" | grep -q "online"; then
    echo "方式2: 使用开发模式启动..."
    
    # 检查是否有vite命令
    if npm list vite &>/dev/null || npm list -g vite &>/dev/null; then
        pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-frontend"
        sleep 5
        
        if pm2 status | grep "nano-frontend" | grep -q "online"; then
            echo "✓ 开发模式启动成功"
        else
            echo "❌ 开发模式启动失败"
            pm2 logs nano-frontend --lines 10 --nostream 2>/dev/null
        fi
    else
        echo "Vite未安装，尝试安装..."
        if [ "$EUID" -eq 0 ]; then
            npm install --unsafe-perm=true --allow-root
        else
            npm install
        fi
    fi
fi

# 方式3: 如果都失败，使用Node.js简单服务器
if ! pm2 status | grep "nano-frontend" | grep -q "online"; then
    echo "方式3: 使用Node.js简单服务器..."
    pm2 start simple-test-server.js --name "nano-frontend"
    sleep 3
fi

echo ""
echo "7. 检查最终状态..."
pm2 status

echo ""
echo "8. 验证端口监听..."
echo "检查5173端口监听状态:"
netstat -tlnp | grep :5173 || echo "端口5173未监听"

# 如果端口监听正确，检查外部连接
if netstat -tlnp | grep :5173 | grep -q "0.0.0.0"; then
    echo "✓ 服务正确监听在0.0.0.0:5173"
    echo ""
    echo "9. 测试连接..."
    echo "本地测试:"
    curl -s -I http://127.0.0.1:5173 | head -3
    
    echo ""
    echo "外部IP测试:"
    curl -s -I http://39.101.165.84:5173 | head -3
else
    echo "❌ 服务未正确监听外部IP"
fi

echo ""
echo "=== 修复完成 ==="
echo "最终访问地址: http://39.101.165.84:5173"
echo ""
echo "如果仍有问题，请检查:"
echo "1. pm2 logs nano-frontend"
echo "2. 系统资源: free -h"
echo "3. 磁盘空间: df -h"