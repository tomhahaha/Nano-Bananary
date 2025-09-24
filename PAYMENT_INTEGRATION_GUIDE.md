# 真实支付集成指南

## 🚀 概述

本指南将帮助你将 Nano-Bananary 应用中的支付系统从模拟支付升级为真实的支付宝和微信支付。

## 📋 前置要求

### 1. 支付宝开放平台申请
1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 注册开发者账号并创建应用
3. 获取以下信息：
   - `APP_ID`：应用ID
   - `私钥`：用于签名的RSA私钥
   - `支付宝公钥`：用于验证支付宝返回数据的公钥

### 2. 微信商户平台申请
1. 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 注册商户号并通过认证
3. 获取以下信息：
   - `APPID`：公众号或小程序的AppID
   - `MCH_ID`：商户号
   - `KEY`：商户密钥

## ⚙️ 配置步骤

### 1. 环境变量配置

复制 `.env.example` 文件为 `.env`：
```bash
cp backend/.env.example backend/.env
```

编辑 `.env` 文件，填入真实的配置信息：
```env
# 支付宝配置
ALIPAY_APP_ID=2021001234567890
ALIPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0B...\n-----END PUBLIC KEY-----
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/alipay/notify
ALIPAY_RETURN_URL=https://your-domain.com/payment/success

# 微信支付配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_KEY=your32characterlongmerchantkey123456
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/wechat/notify

# 服务器配置
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
```

### 2. 安装依赖

```bash
cd backend
npm install
```

新增的依赖包括：
- `axios`：用于HTTP请求
- `dotenv`：用于环境变量管理

### 3. SSL证书配置

⚠️ **重要：支付宝和微信支付的回调接口必须使用HTTPS**

推荐使用以下方式获取SSL证书：
- [Let's Encrypt](https://letsencrypt.org/) - 免费SSL证书
- [Cloudflare](https://www.cloudflare.com/) - 免费CDN + SSL
- 阿里云、腾讯云等云服务商提供的SSL证书

## 🔧 技术实现

### 1. 支付流程

#### 支付宝支付流程：
1. 用户选择支付宝支付
2. 前端调用 `/api/credits/charge` 创建订单
3. 后端生成支付宝支付链接
4. 用户在新窗口完成支付
5. 支付宝异步通知 `/api/payment/alipay/notify`
6. 后端验证签名并更新订单状态
7. 前端轮询订单状态，完成支付流程

#### 微信支付流程：
1. 用户选择微信支付
2. 前端调用 `/api/credits/charge` 创建订单
3. 后端生成微信支付二维码
4. 前端显示二维码，用户扫码支付
5. 微信异步通知 `/api/payment/wechat/notify`
6. 后端验证签名并更新订单状态
7. 前端轮询订单状态，完成支付流程

### 2. 安全措施

- **签名验证**：所有支付回调都进行签名验证
- **HTTPS传输**：敏感数据传输使用HTTPS加密
- **订单幂等性**：防止重复处理同一订单
- **异常处理**：完善的错误处理和日志记录

### 3. 主要接口

#### 创建支付订单
```http
POST /api/credits/charge
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 20,
  "credits": 1600,
  "paymentMethod": "alipay" // 或 "wechat"
}
```

#### 查询订单状态
```http
GET /api/payment/order/:orderId
Authorization: Bearer <token>
```

#### 支付宝回调接口
```http
POST /api/payment/alipay/notify
Content-Type: application/x-www-form-urlencoded
```

#### 微信支付回调接口
```http
POST /api/payment/wechat/notify
Content-Type: text/xml
```

## 🚀 部署指南

### 1. 本地测试

```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd ..
npm run dev
```

### 2. 生产环境部署

1. **部署到云服务器**（推荐阿里云、腾讯云、AWS等）
2. **配置域名和SSL证书**
3. **设置防火墙规则**，开放必要端口
4. **配置反向代理**（Nginx推荐配置）：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🧪 测试

### 1. 支付宝沙箱测试

支付宝提供沙箱环境用于测试：
- 网关地址：`https://openapi.alipaydev.com/gateway.do`
- 使用沙箱版支付宝APP进行测试

### 2. 微信支付测试

微信支付需要申请测试账号进行测试

## 📊 监控和日志

建议添加以下监控：
- 支付成功率监控
- 支付失败原因分析
- 回调接口响应时间监控
- 订单状态同步监控

## ⚠️ 注意事项

1. **密钥安全**：
   - 私钥文件权限设置为600
   - 不要将密钥提交到版本控制系统
   - 定期轮换密钥

2. **回调处理**：
   - 回调接口必须幂等
   - 必须验证签名
   - 处理异常情况

3. **订单管理**：
   - 设置订单超时时间
   - 处理重复支付
   - 支持退款功能

4. **合规要求**：
   - 遵守支付机构的接入规范
   - 符合金融监管要求
   - 保护用户隐私数据

## 🆘 常见问题

### Q: 支付回调接口收不到通知？
A: 检查以下几点：
- 确保回调URL可以从外网访问
- 检查SSL证书是否有效
- 确认防火墙设置是否阻止了请求

### Q: 签名验证失败？
A: 检查以下几点：
- 确认使用的密钥是否正确
- 检查签名算法是否匹配
- 确认参数编码格式

### Q: 订单状态不同步？
A: 建议：
- 增加订单状态查询接口
- 实现定时任务同步订单状态
- 添加手动处理机制

## 📞 技术支持

如需技术支持，请联系：
- 支付宝技术支持：[https://opensupport.alipay.com/](https://opensupport.alipay.com/)
- 微信支付技术支持：[https://pay.weixin.qq.com/](https://pay.weixin.qq.com/)