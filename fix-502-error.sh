#!/bin/bash

echo "=== 修复 HTTP 502 错误 ==="

# 1. 检查端口监听状态
echo "1. 检查端口监听状态..."
echo "检查5173端口监听情况:"
netstat -tuln | grep 5173

echo ""
echo "使用lsof检查端口详情:"
lsof -i :5173

echo ""
echo "2. 检查PM2服务详细状态..."
pm2 status
echo ""
pm2 info nano-frontend

echo ""
echo "3. 查看PM2日志..."
echo "前端服务日志 (最近30行):"
pm2 logs nano-frontend --lines 30 --nostream 2>/dev/null

echo ""
echo "4. 测试本地连接..."
echo "测试127.0.0.1:5173:"
timeout 10 curl -v http://127.0.0.1:5173 2>&1 | head -10

echo ""
echo "测试localhost:5173:"
timeout 10 curl -v http://localhost:5173 2>&1 | head -10

echo ""
echo "5. 检查Vite配置..."
if [ -f "vite.config.ts" ]; then
    echo "当前vite.config.ts内容:"
    cat vite.config.ts
else
    echo "❌ vite.config.ts不存在"
fi

echo ""
echo "6. 检查package.json中的dev脚本..."
if [ -f "package.json" ]; then
    echo "dev脚本配置:"
    grep -A 5 -B 5 '"dev"' package.json
fi

echo ""
echo "7. 检查系统资源..."
echo "内存使用情况:"
free -h

echo ""
echo "磁盘使用情况:"
df -h | head -5

echo ""
echo "8. 强制重启前端服务..."

# 停止现有服务
pm2 stop nano-frontend
sleep 2

# 强制杀掉可能占用端口的进程
echo "释放5173端口..."
sudo kill -9 $(sudo lsof -t -i:5173) 2>/dev/null || true
sleep 3

# 检查dist目录
echo ""
echo "9. 检查构建文件..."
if [ -d "dist" ]; then
    echo "✓ dist目录存在"
    echo "dist目录大小:"
    du -sh dist
    echo "dist目录内容:"
    ls -la dist/ | head -10
else
    echo "❌ dist目录不存在，开始构建..."
    if [ "$EUID" -eq 0 ]; then
        npm run build --unsafe-perm=true
    else
        npm run build
    fi
fi

echo ""
echo "10. 尝试不同的启动方式..."

# 方式1: 使用serve启动静态文件
if command -v serve &> /dev/null && [ -d "dist" ]; then
    echo "方式1: 使用serve启动静态文件..."
    pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-frontend-static"
    sleep 5
    
    echo "检查serve方式启动结果:"
    if pm2 status | grep "nano-frontend-static" | grep -q "online"; then
        echo "✓ serve方式启动成功"
        
        # 验证端口监听
        if netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
            echo "✓ 端口正确监听在0.0.0.0:5173"
        else
            echo "❌ 端口监听有问题"
            netstat -tuln | grep 5173
        fi
        
        # 测试连接
        echo "测试连接:"
        curl -s -I http://127.0.0.1:5173 | head -3
    else
        echo "❌ serve方式启动失败"
        pm2 logs nano-frontend-static --lines 10 --nostream 2>/dev/null
        pm2 delete nano-frontend-static 2>/dev/null || true
    fi
fi

# 方式2: 如果serve失败，使用开发模式
if ! pm2 status | grep "nano-frontend-static" | grep -q "online"; then
    echo ""
    echo "方式2: 使用Vite开发模式..."
    
    # 确保host配置正确
    if ! grep -q "host.*0.0.0.0" vite.config.ts; then
        echo "❌ Vite配置host不正确，需要修复"
        
        # 备份原配置
        cp vite.config.ts vite.config.ts.backup
        
        # 检查配置并提示手动修复
        echo "请确保vite.config.ts包含以下配置:"
        echo "server: {"
        echo "  host: '0.0.0.0',"
        echo "  port: 5173,"
        echo "  strictPort: true,"
        echo "  cors: true"
        echo "}"
    fi
    
    pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-frontend-dev"
    sleep 8
    
    if pm2 status | grep "nano-frontend-dev" | grep -q "online"; then
        echo "✓ 开发模式启动成功"
        
        # 验证监听
        sleep 3
        if netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
            echo "✓ 开发模式端口正确监听"
        else
            echo "❌ 开发模式端口监听有问题"
            netstat -tuln | grep 5173
        fi
    else
        echo "❌ 开发模式启动失败"
        pm2 logs nano-frontend-dev --lines 15 --nostream 2>/dev/null
    fi
fi

# 方式3: 使用简单的Node.js服务器
if ! netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
    echo ""
    echo "方式3: 使用简单Node.js服务器..."
    
    # 清理之前的服务
    pm2 delete nano-frontend-static 2>/dev/null || true
    pm2 delete nano-frontend-dev 2>/dev/null || true
    
    if [ -f "simple-test-server.js" ]; then
        pm2 start simple-test-server.js --name "nano-frontend-simple"
        sleep 3
        
        if pm2 status | grep "nano-frontend-simple" | grep -q "online"; then
            echo "✓ 简单服务器启动成功"
        else
            echo "❌ 简单服务器启动失败"
            pm2 logs nano-frontend-simple --lines 10 --nostream 2>/dev/null
        fi
    fi
fi

echo ""
echo "11. 最终验证..."
echo "PM2状态:"
pm2 status

echo ""
echo "端口监听状态:"
netstat -tuln | grep 5173

echo ""
echo "测试连接:"
if netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
    echo "本地测试:"
    curl -s -I http://127.0.0.1:5173 | head -3
    
    echo ""
    echo "外部IP测试:"
    curl -s -I http://39.101.165.84:5173 | head -3
else
    echo "❌ 服务未正确监听在0.0.0.0:5173"
fi

echo ""
echo "=== 502错误修复完成 ==="
echo ""
echo "如果问题仍然存在："
echo "1. 检查云服务器安全组是否正确配置"
echo "2. 检查是否有其他防火墙软件"
echo "3. 检查网络运营商是否限制端口"
echo "4. 尝试使用其他端口(如5174)进行测试"