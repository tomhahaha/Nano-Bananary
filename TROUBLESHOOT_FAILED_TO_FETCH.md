# Failed to Fetch 问题解决指南

当您在Ubuntu服务器部署后遇到"Failed to fetch"错误时，请按照以下步骤进行排查和解决。

## 🚨 快速修复

### 一键修复脚本
```bash
# 运行自动修复脚本
chmod +x fix-failed-to-fetch.sh
./fix-failed-to-fetch.sh
```

## 🔍 问题原因分析

"Failed to fetch"错误通常由以下原因引起：

1. **后端服务未启动或崩溃**
2. **API地址配置错误**
3. **防火墙阻止了端口访问**
4. **网络连接问题**
5. **CORS跨域问题**

## 📋 手动排查步骤

### 1. 检查后端服务状态
```bash
# 查看PM2进程状态
pm2 status

# 查看后端日志
pm2 logs nano-bananary-backend

# 测试后端API
curl http://localhost:3001/api/health
```

**预期结果**: 应该看到 `{"success":true,"message":"API服务正常运行"}`

### 2. 检查端口占用
```bash
# 检查3001端口（后端API）
netstat -tlnp | grep :3001

# 检查5173端口（前端）
netstat -tlnp | grep :5173
```

**预期结果**: 两个端口都应该被相应的进程占用

### 3. 检查防火墙配置
```bash
# 查看防火墙状态
sudo ufw status

# 确保端口已开放
sudo ufw allow 5173
sudo ufw allow 3001
```

### 4. 测试网络连接
```bash
# 获取服务器IP
hostname -I

# 从服务器内部测试
curl http://localhost:3001/api/health
curl http://localhost:5173

# 从外部测试（替换为实际IP）
curl http://your-server-ip:3001/api/health
curl http://your-server-ip:5173
```

## 🛠️ 常见问题解决方案

### 问题1: 后端服务未启动
```bash
# 重新启动后端服务
cd backend
pm2 start test-server.js --name "nano-bananary-backend"
```

### 问题2: API配置错误
API配置已在最新版本中修复，但如果仍有问题：

```bash
# 重新构建前端
npm run build

# 重启前端服务
pm2 restart nano-bananary-frontend
```

### 问题3: 端口被占用
```bash
# 查找占用进程
sudo lsof -i :3001
sudo lsof -i :5173

# 杀掉占用进程
sudo kill -9 PID_NUMBER
```

### 问题4: 权限问题（Root用户）
```bash
# 如果使用root用户，确保使用正确的参数
npm install --unsafe-perm=true --allow-root
npm run build --unsafe-perm=true
```

### 问题5: 防火墙阻止访问
```bash
# 临时关闭防火墙测试
sudo ufw disable

# 测试是否可以访问
curl http://your-server-ip:5173

# 重新开启防火墙并配置正确规则
sudo ufw enable
sudo ufw allow 5173/tcp
sudo ufw allow 3001/tcp
```

## 🔧 高级故障排除

### 检查系统资源
```bash
# 检查内存使用
free -h

# 检查磁盘空间
df -h

# 检查CPU使用
top
```

### 检查Node.js和npm版本
```bash
node --version
npm --version

# 如果版本过旧，更新Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 重置PM2
```bash
# 完全重置PM2
pm2 kill
pm2 start backend/test-server.js --name "nano-bananary-backend"
pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "nano-bananary-frontend"
```

### 检查网络配置
```bash
# 检查网络接口
ip addr show

# 检查路由
ip route show

# 检查DNS
nslookup google.com
```

## 📊 诊断脚本

使用内置的诊断脚本获取详细信息：

```bash
chmod +x debug-deployment.sh
./debug-deployment.sh
```

此脚本会输出完整的系统状态，包括：
- PM2进程状态
- 端口占用情况
- 防火墙配置
- API连接测试
- 服务日志
- 环境配置

## 🆘 获取帮助

如果以上步骤都无法解决问题，请收集以下信息：

1. **运行诊断脚本的完整输出**:
   ```bash
   ./debug-deployment.sh > debug-output.txt 2>&1
   ```

2. **系统信息**:
   ```bash
   cat /etc/os-release
   node --version
   npm --version
   ```

3. **网络配置**:
   ```bash
   ip addr show
   ufw status verbose
   ```

4. **浏览器控制台错误** (F12 -> Console 标签页)

5. **具体的错误消息和操作步骤**

## 📝 预防措施

为避免类似问题，建议：

1. **定期检查服务状态**: `pm2 status`
2. **监控系统资源**: `htop` 或 `free -h`
3. **设置日志轮转**: 避免日志文件过大
4. **备份配置文件**: 保存工作配置的副本
5. **文档化部署过程**: 记录特定环境的部署细节

## 🔄 完整重新部署

如果问题持续存在，可以尝试完整重新部署：

```bash
# 停止所有服务
pm2 stop all
pm2 delete all

# 清理端口
sudo kill -9 $(sudo lsof -t -i:3001) 2>/dev/null || true
sudo kill -9 $(sudo lsof -t -i:5173) 2>/dev/null || true

# 重新安装依赖
npm install --unsafe-perm=true --allow-root
cd backend && npm install --unsafe-perm=true --allow-root && cd ..

# 重新部署
./deploy-simple.sh
```

记住，在生产环境中建议使用专用用户而非root用户运行应用。