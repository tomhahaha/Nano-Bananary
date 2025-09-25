# Ubuntu Root用户部署指南

如果您只有root用户权限，请按照以下步骤部署Nano-Bananary应用。

## ⚠️ Root用户注意事项

使用root用户运行Node.js应用有安全风险，建议：
1. 仅在测试环境或个人服务器使用
2. 生产环境建议创建专用用户
3. 确保服务器防火墙和网络安全配置正确

## 🚀 Root用户快速部署

### 1. 环境准备
```bash
# 更新系统
apt update

# 安装Node.js (LTS版本)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# 安装PM2和serve (使用--unsafe-perm标志)
npm install -g pm2 --unsafe-perm=true --allow-root
npm install -g serve --unsafe-perm=true --allow-root

# 验证安装
node --version
npm --version
pm2 --version
```

### 2. 项目部署
```bash
# 进入项目目录
cd /path/to/nano-bananary

# 安装项目依赖 (使用--unsafe-perm标志)
npm install --unsafe-perm=true --allow-root

# 安装后端依赖
cd backend
npm install --unsafe-perm=true --allow-root
cd ..

# 创建环境配置
cat > .env.local << EOF
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
EOF
```

### 3. 配置防火墙
```bash
# 安装ufw (如果未安装)
apt install ufw

# 开放端口
ufw allow 5173/tcp comment "Nano-Bananary Frontend"
ufw allow 3001/tcp comment "Nano-Bananary Backend API"
ufw allow ssh  # 确保SSH访问不被阻断

# 启用防火墙
ufw --force enable

# 查看状态
ufw status
```

### 4. 启动服务

#### 方式一：开发模式
```bash
# 启动后端
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

# 启动前端开发服务器
pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
```

#### 方式二：生产模式
```bash
# 启动后端
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

# 构建前端
npm run build --unsafe-perm=true

# 启动前端生产服务器
pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"
```

### 5. 配置PM2自启动
```bash
# 保存PM2配置
pm2 save

# 生成系统启动脚本
pm2 startup

# 执行输出的命令（类似下面的命令）
# systemctl enable pm2-root
```

## 🛠️ 一键部署脚本

项目已包含支持root用户的自动部署脚本：

```bash
# 给脚本执行权限
chmod +x deploy-simple.sh

# 运行自动部署脚本（现在支持root用户）
./deploy-simple.sh
```

## 📊 服务管理

### 查看服务状态
```bash
# 查看PM2进程
pm2 status

# 查看系统资源
htop

# 查看端口占用
netstat -tlnp | grep :5173
netstat -tlnp | grep :3001
```

### 重启服务
```bash
# 重启所有PM2进程
pm2 restart all

# 重启特定服务
pm2 restart nano-bananary-frontend
pm2 restart nano-bananary-backend
```

### 查看日志
```bash
# 查看所有日志
pm2 logs

# 查看特定服务日志
pm2 logs nano-bananary-frontend
pm2 logs nano-bananary-backend

# 实时查看日志
pm2 logs --lines 50 -f
```

## 🔧 故障排除

### 权限问题
如果遇到权限错误，尝试：
```bash
# 确保使用--unsafe-perm标志
npm install --unsafe-perm=true --allow-root

# 或者修改npm配置
npm config set unsafe-perm true
```

### PM2相关问题
```bash
# 如果PM2无法启动，重置PM2
pm2 kill
pm2 resurrect

# 清理PM2日志
pm2 flush

# 重新生成启动脚本
pm2 unstartup
pm2 startup
```

### 网络访问问题
```bash
# 检查防火墙状态
ufw status verbose

# 临时关闭防火墙测试
ufw disable

# 检查服务是否监听正确端口
ss -tlnp | grep :5173
ss -tlnp | grep :3001
```

## 🔒 安全建议

### 1. 创建专用用户（推荐）
```bash
# 创建应用用户
useradd -m -s /bin/bash nanoapp
usermod -aG sudo nanoapp

# 切换到应用用户
su - nanoapp

# 然后使用普通用户部署流程
```

### 2. 限制网络访问
```bash
# 只允许特定IP访问（可选）
ufw allow from 192.168.1.0/24 to any port 5173
ufw allow from 192.168.1.0/24 to any port 3001
```

### 3. 配置反向代理（可选）
```bash
# 安装Nginx
apt install nginx

# 配置反向代理，隐藏端口
# 参考完整部署文档中的Nginx配置
```

## 📝 访问应用

部署完成后，通过以下地址访问：

- **前端应用**: `http://your-server-ip:5173`
- **后端API**: `http://your-server-ip:3001/api`

```bash
# 获取服务器IP地址
hostname -I | awk '{print $1}'
```

## 📋 检查清单

部署完成后，确认以下项目：

- [ ] Node.js和npm正确安装
- [ ] PM2进程管理器运行正常
- [ ] 前端服务运行在5173端口
- [ ] 后端API运行在3001端口
- [ ] 防火墙正确配置
- [ ] 可以通过IP地址访问应用
- [ ] PM2自启动配置完成

如遇到问题，请查看PM2日志或联系技术支持。