#!/bin/bash

echo "=== 修复 serve 命令参数错误 ==="

# 1. 停止错误的serve进程
echo "1. 停止错误的serve进程..."
pm2 delete nano-frontend 2>/dev/null || true
pm2 delete nano-frontend-static 2>/dev/null || true
pm2 delete nano-frontend-serve 2>/dev/null || true

# 强制释放端口
sudo kill -9 $(sudo lsof -t -i:5173) 2>/dev/null || true
sleep 3

echo ""
echo "2. 检查serve版本和支持的参数..."
serve --help | head -20

echo ""
echo "3. 使用正确的serve命令启动..."

# 检查dist目录是否存在
if [ ! -d "dist" ]; then
    echo "dist目录不存在，开始构建..."
    if [ "$EUID" -eq 0 ]; then
        npm run build --unsafe-perm=true
    else
        npm run build
    fi
fi

if [ -d "dist" ]; then
    echo "使用正确的serve参数启动服务..."
    
    # 方法1: 使用 --listen 参数 (新版本serve)
    echo "尝试方法1: serve -s dist --listen 0.0.0.0:5173"
    pm2 start "serve -s dist --listen 0.0.0.0:5173" --name "nano-frontend-serve"
    sleep 5
    
    # 检查是否启动成功
    if pm2 status | grep "nano-frontend-serve" | grep -q "online"; then
        echo "✓ 方法1启动成功"
    else
        echo "方法1失败，尝试方法2..."
        pm2 delete nano-frontend-serve 2>/dev/null || true
        
        # 方法2: 使用环境变量设置host
        echo "尝试方法2: 设置HOST环境变量"
        pm2 start "HOST=0.0.0.0 PORT=5173 serve -s dist" --name "nano-frontend-serve"
        sleep 5
        
        if pm2 status | grep "nano-frontend-serve" | grep -q "online"; then
            echo "✓ 方法2启动成功"
        else
            echo "方法2失败，尝试方法3..."
            pm2 delete nano-frontend-serve 2>/dev/null || true
            
            # 方法3: 只指定端口，默认监听所有接口
            echo "尝试方法3: serve -s dist -p 5173"
            pm2 start "serve -s dist -p 5173" --name "nano-frontend-serve"
            sleep 5
            
            if pm2 status | grep "nano-frontend-serve" | grep -q "online"; then
                echo "✓ 方法3启动成功"
            else
                echo "serve启动失败，尝试使用Vite..."
                pm2 delete nano-frontend-serve 2>/dev/null || true
            fi
        fi
    fi
fi

# 如果serve都失败了，使用Vite开发模式
if ! pm2 status | grep "nano-frontend-serve" | grep -q "online"; then
    echo ""
    echo "4. serve启动失败，使用Vite开发模式..."
    
    # 确保Vite配置正确
    if ! grep -q "host.*0.0.0.0" vite.config.ts; then
        echo "❌ 需要修复vite.config.ts配置"
        echo "当前配置:"
        cat vite.config.ts
    else
        echo "✓ Vite配置正确，启动开发服务器..."
        pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-frontend-dev"
        sleep 8
        
        if pm2 status | grep "nano-frontend-dev" | grep -q "online"; then
            echo "✓ Vite开发模式启动成功"
        else
            echo "❌ Vite开发模式启动失败"
            pm2 logs nano-frontend-dev --lines 10 --nostream 2>/dev/null
        fi
    fi
fi

# 如果还是失败，使用简单的Node.js服务器
if ! netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
    echo ""
    echo "5. 使用简单Node.js服务器..."
    
    if [ -f "simple-test-server.js" ]; then
        pm2 delete nano-frontend-dev 2>/dev/null || true
        pm2 delete nano-frontend-serve 2>/dev/null || true
        
        pm2 start simple-test-server.js --name "nano-frontend-simple"
        sleep 3
        
        if pm2 status | grep "nano-frontend-simple" | grep -q "online"; then
            echo "✓ 简单服务器启动成功"
        else
            echo "❌ 简单服务器启动失败"
        fi
    fi
fi

echo ""
echo "6. 验证最终状态..."
echo "PM2状态:"
pm2 status

echo ""
echo "端口监听状态:"
netstat -tuln | grep 5173

echo ""
echo "测试连接:"
if netstat -tuln | grep 5173; then
    echo "本地测试:"
    curl -s -I http://127.0.0.1:5173 | head -3 || echo "本地连接失败"
    
    echo ""
    echo "外部IP测试:"
    curl -s -I http://39.101.165.84:5173 | head -3 || echo "外部连接失败"
    
    # 检查是否正确绑定到0.0.0.0
    if netstat -tuln | grep 5173 | grep -q "0.0.0.0"; then
        echo "✓ 服务正确监听在0.0.0.0:5173"
    else
        echo "⚠️ 服务可能只监听在127.0.0.1，外部访问可能失败"
        echo "当前监听状态:"
        netstat -tuln | grep 5173
    fi
else
    echo "❌ 端口5173未被监听"
fi

echo ""
echo "=== 修复完成 ==="
echo "访问地址: http://39.101.165.84:5173"