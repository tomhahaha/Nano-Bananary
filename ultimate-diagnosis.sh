#!/bin/bash

echo "=== 终极 502 问题诊断 ==="

echo "1. 检查Node.js和npm版本:"
node --version
npm --version

echo ""
echo "2. 检查项目依赖是否完整:"
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules目录不存在，重新安装依赖"
    if [ "$EUID" -eq 0 ]; then
        npm install --unsafe-perm=true --allow-root
    else
        npm install
    fi
else
    echo "✅ node_modules目录存在"
fi

echo ""
echo "3. 检查关键依赖:"
npm list vite 2>/dev/null | head -1 || echo "❌ vite依赖缺失"
npm list react 2>/dev/null | head -1 || echo "❌ react依赖缺失"

echo ""
echo "4. 手动启动vite服务器 (前台模式):"
echo "尝试直接启动vite..."

# 先杀掉可能存在的进程
pkill -f "vite\|npm.*dev" 2>/dev/null || true

# 设置环境变量并启动vite
export HOST=0.0.0.0
export PORT=5173

# 尝试启动vite，捕获输出
echo "启动命令: HOST=0.0.0.0 PORT=5173 npm run dev"
timeout 15s npm run dev &
VITE_PID=$!

# 等待启动
sleep 8

# 检查进程是否还在运行
if kill -0 $VITE_PID 2>/dev/null; then
    echo "✅ Vite进程运行中"
    
    # 测试连接
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ 本地5173端口响应正常"
    else
        echo "❌ 本地5173端口无响应"
    fi
    
    # 检查网络绑定
    echo "检查网络绑定:"
    netstat -tuln | grep 5173
    
    # 停止测试进程
    kill $VITE_PID 2>/dev/null
    sleep 2
else
    echo "❌ Vite进程启动失败"
fi

echo ""
echo "5. 检查package.json脚本:"
echo "dev脚本内容:"
cat package.json | grep -A 1 -B 1 '"dev"'

echo ""
echo "6. 尝试使用vite直接启动:"
echo "测试: npx vite --host 0.0.0.0 --port 5173"
timeout 10s npx vite --host 0.0.0.0 --port 5173 &
DIRECT_VITE_PID=$!
sleep 5

if kill -0 $DIRECT_VITE_PID 2>/dev/null; then
    echo "✅ 直接vite启动成功"
    
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ 直接vite响应正常"
    else
        echo "❌ 直接vite无响应"
    fi
    
    kill $DIRECT_VITE_PID 2>/dev/null
else
    echo "❌ 直接vite启动失败"
fi

echo ""
echo "=== 诊断建议 ==="
echo "如果上述测试都失败，可能的问题："
echo "1. React 19.1.1 与当前Node.js版本不兼容"
echo "2. 项目依赖安装不完整"
echo "3. TypeScript编译错误"
echo "4. 磁盘空间不足"
echo ""
echo "建议的解决步骤："
echo "1. 重新安装依赖: rm -rf node_modules package-lock.json && npm install"
echo "2. 降级React版本或升级Node.js"
echo "3. 检查错误日志: npm run dev 查看详细错误信息"