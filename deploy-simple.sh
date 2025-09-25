#!/bin/bash

# Nano-Bananary Ubuntu部署脚本 - IP直接访问版本 (支持root用户)
# 通过 IP:5173 端口直接访问前端应用

echo "=== Nano-Bananary Ubuntu部署 - IP直接访问配置 ==="

# 检查用户类型
if [ "$EUID" -eq 0 ]; then
    echo "检测到root用户，将使用root权限进行部署"
    USE_SUDO=""
else
    echo "检测到普通用户，将使用sudo权限"
    USE_SUDO="sudo"
fi

# 1. 系统环境准备
echo "1. 安装系统依赖..."
$USE_SUDO apt update

# 安装Node.js (如果未安装)
if ! command -v node &> /dev/null; then
    echo "安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | $USE_SUDO -E bash -
    $USE_SUDO apt-get install -y nodejs
fi

# 安装PM2 (如果未安装)
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    if [ "$EUID" -eq 0 ]; then
        npm install -g pm2 --unsafe-perm=true --allow-root
    else
        $USE_SUDO npm install -g pm2
    fi
fi

# 安装serve (用于生产环境)
if ! command -v serve &> /dev/null; then
    echo "安装serve..."
    if [ "$EUID" -eq 0 ]; then
        npm install -g serve --unsafe-perm=true --allow-root
    else
        $USE_SUDO npm install -g serve
    fi
fi

echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"

# 2. 项目配置
echo "2. 安装项目依赖..."
if [ "$EUID" -eq 0 ]; then
    npm install --unsafe-perm=true --allow-root
else
    npm install
fi

# 检查后端目录
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

# 3. 环境配置
echo "3. 检查环境配置..."
if [ ! -f ".env.local" ]; then
    echo "创建.env.local文件..."
    cat > .env.local << EOF
# Gemini API配置
GEMINI_API_KEY=your_gemini_api_key_here

# 环境设置
NODE_ENV=production
EOF
    echo "请编辑 .env.local 文件，添加您的GEMINI_API_KEY"
fi

# 4. 防火墙配置
echo "4. 配置防火墙..."
$USE_SUDO ufw allow 5173/tcp comment "Nano-Bananary Frontend"
$USE_SUDO ufw allow 3001/tcp comment "Nano-Bananary Backend API"

# 如果防火墙未启用，询问是否启用
if ! $USE_SUDO ufw status | grep -q "Status: active"; then
    read -p "是否启用防火墙? (y/n): " enable_firewall
    if [ "$enable_firewall" = "y" ] || [ "$enable_firewall" = "Y" ]; then
        $USE_SUDO ufw --force enable
    fi
fi

# 5. 启动后端服务
echo "5. 启动后端服务..."
if [ -f "backend/test-server.js" ]; then
    cd backend
    pm2 delete nano-bananary-backend 2>/dev/null || true
    pm2 start test-server.js --name "nano-bananary-backend"
    cd ..
    echo "后端服务已启动在3001端口"
else
    echo "未找到后端服务文件，跳过后端启动"
fi

# 6. 选择启动方式
echo "6. 选择前端启动方式:"
echo "1) 开发模式 (支持热重载)"
echo "2) 生产模式 (构建后启动)"
read -p "请选择 (1-2): " choice

case $choice in
    1)
        echo "启动开发模式..."
        pm2 delete nano-bananary-frontend 2>/dev/null || true
        pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
        ;;
    2)
        echo "构建生产版本..."
        npm run build
        echo "启动生产模式..."
        pm2 delete nano-bananary-frontend 2>/dev/null || true
        pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"
        ;;
    *)
        echo "无效选择，使用开发模式..."
        pm2 delete nano-bananary-frontend 2>/dev/null || true
        pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
        ;;
esac

# 7. 保存PM2配置
pm2 save
pm2 startup

# 8. 获取服务器IP地址
echo ""
echo "=== 部署完成 ==="
echo "服务访问信息:"
echo "- 前端地址: http://$(hostname -I | awk '{print $1}'):5173"
echo "- 后端API: http://$(hostname -I | awk '{print $1}'):3001/api"
echo ""
echo "PM2进程状态:"
pm2 status
echo ""
echo "如需查看日志:"
echo "  pm2 logs nano-bananary-frontend"
echo "  pm2 logs nano-bananary-backend"
echo ""
echo "如需重启服务:"
echo "  pm2 restart nano-bananary-frontend"
echo "  pm2 restart nano-bananary-backend"