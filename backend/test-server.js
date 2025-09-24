const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'database.json');

// 简化的用户会话管理（存储token对应的用户ID）
const userSessions = new Map();
// 存储验证码（手机号 -> 验证码）
const verificationCodes = new Map();

// 初始化数据库
function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: 'test-user-1',
          username: 'testuser',
          phone: '13800138000',
          credits: 1000,
          password_hash: '$2a$10$example',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      creditTransactions: [
        {
          id: 'trans-1',
          userId: 'test-user-1',
          type: 'charge',
          amount: 100,
          balance: 1000,
          description: '注册奖励',
          createdAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// 读取数据库
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据库失败:', error);
    initDatabase();
    return readDatabase();
  }
}

// 写入数据库
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('写入数据库失败:', error);
  }
}

// 初始化数据库
initDatabase();

// 从请求中获取当前用户
function getCurrentUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const userId = userSessions.get(token);
  
  if (!userId) {
    return null;
  }
  
  const db = readDatabase();
  return db.users.find(u => u.id === userId);
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API服务正常运行' });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { loginType, identifier, password, captcha } = req.body;
  
  console.log('Received login request:', { loginType, identifier });
  
  const db = readDatabase();
  
  // 查找用户（根据用户名或手机号）
  const user = db.users.find(u => 
    u.username === identifier || u.phone === identifier
  );
  
  if (user) {
    // 模拟密码验证（在实际应用中应该使用bcrypt等加密库）
    // 目前简化处理，任意密码都能登录
    const token = 'mock-jwt-token-' + Date.now() + '-' + user.id;
    
    // 存储用户会话
    userSessions.set(token, user.id);
    
    res.json({
      success: true,
      message: '登录成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        credits: user.credits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, phone, password } = req.body;
  
  console.log('Received register request:', { username, phone });
  
  const db = readDatabase();
  
  // 检查手机号是否已经注册
  const existingUser = db.users.find(u => u.phone === phone);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: '该手机号已经注册，请直接登录或使用其他手机号'
    });
  }
  
  // 检查用户名是否已存在
  const existingUsername = db.users.find(u => u.username === username);
  if (existingUsername) {
    return res.status(409).json({
      success: false,
      message: '用户名已存在，请选择其他用户名'
    });
  }
  
  const newUser = {
    id: 'user-' + Date.now(),
    username,
    phone,
    credits: 100,
    password_hash: '$2a$10$example',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  writeDatabase(db);
  
  const token = 'mock-jwt-token-' + Date.now() + '-' + newUser.id;
  
  // 存储用户会话
  userSessions.set(token, newUser.id);
  
  res.status(201).json({
    success: true,
    message: '注册成功',
    token: token,
    user: {
      id: newUser.id,
      username: newUser.username,
      phone: newUser.phone,
      credits: newUser.credits,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    }
  });
});

// 发送验证码（忘记密码）
app.post('/api/auth/send-verification-code', (req, res) => {
  const { phone } = req.body;
  
  console.log('Received send verification code request:', { phone });
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: '请输入手机号'
    });
  }
  
  const db = readDatabase();
  const user = db.users.find(u => u.phone === phone);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '该手机号尚未注册，请先注册账号'
    });
  }
  
  // 生成隨机6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 存储验证码（实际应用中应设置过期时间）
  verificationCodes.set(phone, {
    code,
    timestamp: Date.now(),
    used: false
  });
  
  // 模拟发送短信（实际应用中应调用短信服务）
  console.log(`验证码已发送至 ${phone}: ${code}`);
  
  res.json({
    success: true,
    message: '验证码已发送，请注意查收',
    // 开发环境下返回验证码，生产环境下应删除
    code: process.env.NODE_ENV === 'development' ? code : undefined
  });
});

// 重置密码
app.post('/api/auth/reset-password', (req, res) => {
  const { phone, verificationCode, newPassword } = req.body;
  
  console.log('Received reset password request:', { phone, verificationCode });
  
  if (!phone || !verificationCode || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '请填写完整信息'
    });
  }
  
  // 验证验证码
  const storedCode = verificationCodes.get(phone);
  if (!storedCode) {
    return res.status(400).json({
      success: false,
      message: '验证码已过期，请重新获取'
    });
  }
  
  if (storedCode.used) {
    return res.status(400).json({
      success: false,
      message: '验证码已使用，请重新获取'
    });
  }
  
  if (storedCode.code !== verificationCode) {
    return res.status(400).json({
      success: false,
      message: '验证码错误'
    });
  }
  
  // 检查验证码是否过期（5分钟）
  if (Date.now() - storedCode.timestamp > 5 * 60 * 1000) {
    verificationCodes.delete(phone);
    return res.status(400).json({
      success: false,
      message: '验证码已过期，请重新获取'
    });
  }
  
  const db = readDatabase();
  const user = db.users.find(u => u.phone === phone);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }
  
  // 更新密码（实际应用中应使用bcrypt加密）
  user.password_hash = '$2a$10$' + newPassword; // 简化处理
  user.updatedAt = new Date().toISOString();
  
  writeDatabase(db);
  
  // 标记验证码为已使用
  storedCode.used = true;
  
  res.json({
    success: true,
    message: '密码重置成功，请使用新密码登录'
  });
});

app.get('/api/user/profile', (req, res) => {
  console.log('Received profile request');
  
  const user = getCurrentUserFromToken(req);
  
  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        credits: user.credits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '用户未登录或token无效'
    });
  }
});

// Credits endpoints
app.post('/api/credits/charge', (req, res) => {
  const { amount, credits } = req.body;
  
  console.log('Received charge request:', { amount, credits });
  
  const user = getCurrentUserFromToken(req);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '用户未登录或token无效'
    });
  }
  
  // 读取数据库
  const db = readDatabase();
  const dbUser = db.users.find(u => u.id === user.id);
  
  if (dbUser) {
    // 更新用户积分
    dbUser.credits += credits;
    dbUser.updatedAt = new Date().toISOString();
    
    // 添加充值记录
    const transaction = {
      id: 'trans-' + Date.now(),
      userId: dbUser.id,
      type: 'charge',
      amount: credits,
      balance: dbUser.credits,
      description: `充值${amount}元`,
      createdAt: new Date().toISOString()
    };
    db.creditTransactions.push(transaction);
    
    // 写入数据库
    writeDatabase(db);
    
    console.log('充值后用户积分:', dbUser.credits);
    
    res.json({
      success: true,
      message: '充值成功',
      order: {
        id: 'order-' + Date.now(),
        amount,
        credits,
        status: 'completed'
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }
});

app.get('/api/credits/transactions', (req, res) => {
  console.log('Received transactions request');
  
  const user = getCurrentUserFromToken(req);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '用户未登录或token无效'
    });
  }
  
  const db = readDatabase();
  const userTransactions = db.creditTransactions.filter(t => t.userId === user.id);
  
  res.json({
    success: true,
    data: userTransactions
  });
});

app.post('/api/credits/consume', (req, res) => {
  const { amount, description } = req.body;
  
  console.log('Received consume request:', { amount, description });
  
  const user = getCurrentUserFromToken(req);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '用户未登录或token无效'
    });
  }
  
  const db = readDatabase();
  const dbUser = db.users.find(u => u.id === user.id);
  
  if (dbUser && dbUser.credits >= amount) {
    dbUser.credits -= amount;
    dbUser.updatedAt = new Date().toISOString();
    
    const transaction = {
      id: 'trans-' + Date.now(),
      userId: dbUser.id,
      type: 'consume',
      amount: amount,
      balance: dbUser.credits,
      description: description || '积分消费',
      createdAt: new Date().toISOString()
    };
    db.creditTransactions.push(transaction);
    
    writeDatabase(db);
    
    res.json({
      success: true,
      balance: dbUser.credits
    });
  } else {
    res.status(400).json({
      success: false,
      message: '积分不足'
    });
  }
});

// Catch all for unknown routes
app.use('*', (req, res) => {
  console.log('Unknown route:', req.method, req.originalUrl);
  res.status(404).json({ success: false, message: '接口不存在' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo server with persistent storage running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database file: ${DB_PATH}`);
});