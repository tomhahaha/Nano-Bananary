#!/bin/bash

# Nano-Bananary Ubuntu部署脚本
# 目标：通过 http://39.101.165.84:5173/ 访问应用

echo "=== Nano-Bananary 部署开始 ==="

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    if [ "$EUID" -eq 0 ]; then
        npm install -g pm2 --unsafe-perm=true --allow-root
    else
        sudo npm install -g pm2
    fi
fi

# 安装前端依赖
echo "安装前端依赖..."
if [ "$EUID" -eq 0 ]; then
    npm install --unsafe-perm=true --allow-root
else
    npm install
fi

# 安装后端依赖
echo "安装后端依赖..."
cd backend
if [ "$EUID" -eq 0 ]; then
    npm install --unsafe-perm=true --allow-root
else
    npm install
fi
cd ..

# 创建日志目录
echo "创建日志目录..."
mkdir -p logs

# 停止已存在的服务
echo "停止已存在的服务..."
pm2 delete frontend-service 2>/dev/null || true
pm2 delete backend-service 2>/dev/null || true

# 使用PM2配置文件启动服务
echo "启动服务..."
pm2 start ecosystem.config.json

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 验证服务状态
echo "验证服务状态..."
pm2 status

# 验证端口监听
echo "验证端口监听状态..."
netstat -tuln | grep ":5173\|:3001"

echo ""
echo "=== 部署完成 ==="
echo "前端访问地址: http://39.101.165.84:5173/"
echo "后端API地址: http://39.101.165.84:3001/api"
echo ""
echo "如果无法访问，请检查："
echo "1. 服务器防火墙是否开放5173和3001端口"
echo "2. 云服务器安全组是否配置正确"
echo "3. 运行 'pm2 logs' 查看服务日志"