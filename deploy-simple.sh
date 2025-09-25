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