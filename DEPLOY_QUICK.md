# Ubuntu快速部署指南 - IP直接访问

通过IP地址和5173端口直接访问Nano-Bananary应用。

## 快速部署命令

### 1. 环境准备
```bash
# 更新系统
sudo apt update

# 安装Node.js (LTS版本)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2进程管理器
sudo npm install -g pm2

# 安装serve静态文件服务器
sudo npm install -g serve
```

### 2. 项目部署
```bash
# 上传项目文件到服务器
# 进入项目目录
cd nano-bananary

# 安装依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..

# 创建环境配置
nano .env.local
```

在`.env.local`中添加：
```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
```

### 3. 启动服务

#### 方式一：开发模式（推荐用于测试）
```bash
# 启动后端API服务
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

# 启动前端开发服务器（支持IP访问）
pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
```

#### 方式二：生产模式
```bash
# 启动后端API服务
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
cd ..

# 构建前端
npm run build

# 启动前端生产服务器
pm2 start "serve -s dist -l 5173 -H 0.0.0.0" --name "nano-bananary-frontend"
```

### 4. 防火墙配置
```bash
# 开放端口
sudo ufw allow 5173  # 前端应用
sudo ufw allow 3001  # 后端API

# 启用防火墙（如果未启用）
sudo ufw enable

# 查看状态
sudo ufw status
```

### 5. 查看服务状态
```bash
# 查看PM2进程状态
pm2 status

# 查看日志
pm2 logs nano-bananary-frontend
pm2 logs nano-bananary-backend

# 查看服务器IP
hostname -I
```

## 访问应用

### 获取服务器IP地址
```bash
# 查看服务器IP
ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1
# 或者
hostname -I | awk '{print $1}'
```

### 访问地址
- **前端应用**: `http://your-server-ip:5173`
- **后端API**: `http://your-server-ip:3001/api`

例如：如果服务器IP是 `192.168.1.100`，则访问地址为：
- 前端：`http://192.168.1.100:5173`
- API：`http://192.168.1.100:3001/api`

## 服务管理

### PM2常用命令
```bash
# 查看所有进程
pm2 status

# 重启服务
pm2 restart nano-bananary-frontend
pm2 restart nano-bananary-backend

# 停止服务
pm2 stop nano-bananary-frontend
pm2 stop nano-bananary-backend

# 删除服务
pm2 delete nano-bananary-frontend
pm2 delete nano-bananary-backend

# 查看日志
pm2 logs
pm2 logs nano-bananary-frontend --lines 100

# 保存PM2配置
pm2 save

# 设置开机自启动
pm2 startup
```

### 重启所有服务
```bash
# 重启所有PM2进程
pm2 restart all

# 重新加载服务（零停机时间）
pm2 reload all
```

## 故障排除

### 检查端口占用
```bash
# 检查5173端口
sudo netstat -tlnp | grep :5173

# 检查3001端口
sudo netstat -tlnp | grep :3001
```

### 检查防火墙状态
```bash
# 查看防火墙规则
sudo ufw status verbose

# 如果无法访问，临时关闭防火墙测试
sudo ufw disable
```

### 检查服务日志
```bash
# 实时查看前端日志
pm2 logs nano-bananary-frontend --lines 50 -f

# 实时查看后端日志
pm2 logs nano-bananary-backend --lines 50 -f
```

## 一键部署脚本

项目已包含自动部署脚本 `deploy-simple.sh`：

```bash
# 给脚本执行权限
chmod +x deploy-simple.sh

# 运行自动部署脚本
./deploy-simple.sh
```

此脚本会自动完成所有部署步骤，并显示访问地址。