# Ubuntu部署指南

## 1. 系统环境准备

### 安装Node.js (LTS版本)
```bash
# 更新包管理器
sudo apt update

# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 安装MySQL (如果需要数据库功能)
```bash
# 安装MySQL服务器
sudo apt install mysql-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置MySQL
sudo mysql_secure_installation
```

### 安装其他必要工具
```bash
# 安装Git
sudo apt install git

# 安装PM2进程管理器 (用于生产环境)
sudo npm install -g pm2

# 安装Nginx (可选，用于反向代理)
sudo apt install nginx
```

## 2. 项目部署步骤

### 克隆项目代码
```bash
# 克隆项目到服务器
git clone <your-repository-url> nano-bananary
cd nano-bananary

# 或者如果是从本地上传
# scp -r /path/to/local/project user@server:/path/to/deployment/
```

### 安装项目依赖
```bash
# 安装前端依赖
npm install

# 如果有后端依赖，也需要安装
cd backend
npm install
cd ..
```

### 环境配置
```bash
# 创建环境配置文件
cp .env.example .env.local
# 或者手动创建
nano .env.local
```

在.env.local中配置：
```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

### 数据库配置 (如果使用数据库)
```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE banana;

# 创建用户并授权
CREATE USER 'your_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON banana.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 运行数据库初始化脚本
mysql -u your_user -p banana < backend/init_database.sql
```

## 3. 构建和启动应用

### 方式一：直接启动开发服务器（推荐用于快速部署）
```bash
# 直接启动前端开发服务器，监听所有网卡
npm run dev -- --host 0.0.0.0 --port 5173

# 或者使用PM2管理前端服务
pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
```

### 方式二：构建生产版本（用于正式部署）
```bash
# 构建生产版本
npm run build

# 使用serve启动静态文件服务
npm install -g serve
serve -s dist -l 5173 -H 0.0.0.0

# 或者使用PM2管理
pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"
```

### 启动后端服务 (如果有)
```bash
# 使用PM2启动后端服务
cd backend
pm2 start test-server.js --name "nano-bananary-backend"

# 或者直接启动 (开发模式)
node test-server.js
```

### 配置Vite开发服务器（支持IP访问）
```bash
# 修改vite.config.ts配置文件
nano vite.config.ts
```

确保vite.config.ts包含以下配置：
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 监听所有网卡
    port: 5173,
    strictPort: true, // 如果端口被占用则退出
    cors: true // 启用CORS
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  }
})
```

### 可选：配置Nginx反向代理（如需域名访问）
如果您需要通过域名访问，可以配置Nginx：
```bash
# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/nano-bananary
```

Nginx配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 代理到前端服务
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. 服务管理

### PM2进程管理
```bash
# 查看运行状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart nano-bananary-backend

# 停止服务
pm2 stop nano-bananary-backend

# 保存PM2配置
pm2 save
pm2 startup
```

### 防火墙配置
```bash
# 开放必要端口
sudo ufw allow 5173  # 前端应用端口
sudo ufw allow 3001  # 后端API端口
sudo ufw allow 80    # HTTP端口（如果使用Nginx）
sudo ufw allow 443   # HTTPS端口（如果使用SSL）

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

## 5. SSL证书配置 (可选，推荐生产环境)

### 使用Let's Encrypt
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 6. 监控和维护

### 设置日志轮转
```bash
# 创建logrotate配置
sudo nano /etc/logrotate.d/nano-bananary
```

配置内容：
```
/path/to/nano-bananary/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload nano-bananary-backend
    endscript
}
```

### 系统监控
```bash
# 安装htop监控工具
sudo apt install htop

# 监控系统资源
htop

# 监控磁盘使用
df -h

# 监控内存使用
free -h
```

## 7. 故障排除

### 常见问题检查
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3001

# 检查PM2状态
pm2 status

# 检查Nginx状态
sudo systemctl status nginx

# 检查系统日志
sudo journalctl -u nginx
sudo journalctl -f
```

### 重启所有服务
```bash
# 重启后端
pm2 restart all

# 重启Nginx
sudo systemctl restart nginx

# 重启MySQL
sudo systemctl restart mysql
```

## 8. 性能优化建议

### 系统优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
sudo nano /etc/sysctl.conf
# 添加：
# net.core.somaxconn = 65535
# net.ipv4.tcp_max_syn_backlog = 65535
```

### 数据库优化
```bash
# 优化MySQL配置
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# 根据服务器配置调整参数
```

这个部署指南涵盖了从系统环境准备到生产环境运行的完整流程。根据您的具体需求，可以选择性执行相关步骤。