# Nano-Bananary 部署指南

## 快速部署到Ubuntu服务器

### 1. 上传代码到服务器
```bash
# 在服务器上创建目录并上传代码
mkdir -p /opt/nano-bananary
cd /opt/nano-bananary
# 将代码上传到此目录
```

### 2. 一键部署
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 3. 验证部署
部署完成后，打开浏览器访问：
- **前端应用**: http://39.101.165.84:5173/
- **后端API**: http://39.101.165.84:3001/api/health

### 4. 管理服务
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all
```

## 故障排除

### 如果无法访问5173端口
1. 检查服务是否正确监听外部网卡：
```bash
netstat -tuln | grep 5173
# 应该显示 0.0.0.0:5173，而不是 127.0.0.1:5173
```

2. 检查防火墙：
```bash
sudo ufw allow 5173
sudo ufw allow 3001
```

3. 检查云服务器安全组是否开放5173和3001端口

### 如果服务启动失败
```bash
# 查看详细日志
pm2 logs frontend-service
pm2 logs backend-service

# 手动重启
pm2 restart frontend-service
pm2 restart backend-service
```

## 部署架构
- **前端**: React + Vite (端口 5173)
- **后端**: Node.js Express (端口 3001)  
- **进程管理**: PM2
- **数据存储**: JSON文件 (backend/database.json)

## 重要提醒
- 确保服务器已开放5173和3001端口
- 云服务器需要配置安全组规则
- 服务会绑定到0.0.0.0，支持外部访问