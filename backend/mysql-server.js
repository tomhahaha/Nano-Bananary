const express = require('express');
const cors = require('cors');
const db = require('./database');
const app = express();
const PORT = 3001;

// 简化的用户会话管理（存储token对应的用户ID）
const userSessions = new Map();

// 从请求中获取当前用户
async function getCurrentUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const userId = userSessions.get(token);
  
  if (!userId) {
    return null;
  }
  
  try {
    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

// 生成唯一ID
function generateId(prefix = '') {
  return prefix + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.testConnection();
    res.json({ success: true, message: 'API服务和数据库连接正常' });
  } catch (error) {
    res.status(500).json({ success: false, message: '数据库连接异常' });
  }
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { loginType, identifier, password, captcha } = req.body;
  
  console.log('Received login request:', { loginType, identifier });
  
  try {
    // 查找用户（根据用户名或手机号）
    const users = await db.query(
      'SELECT * FROM users WHERE username = ? OR phone = ? AND status = 1',
      [identifier, identifier]
    );
    
    if (users.length > 0) {
      const user = users[0];
      // 模拟密码验证（在实际应用中应该使用bcrypt等加密库）
      // 目前简化处理，任意密码都能登录
      const token = 'jwt-token-' + Date.now() + '-' + user.id;
      
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
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录服务异常，请稍后重试'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, phone, password } = req.body;
  
  console.log('Received register request:', { username, phone });
  
  try {
    // 检查用户名和手机号是否已存在
    const existingUsers = await db.query(
      'SELECT * FROM users WHERE username = ? OR phone = ?',
      [username, phone]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名或手机号已存在'
      });
    }
    
    const userId = generateId('user-');
    
    // 创建新用户
    await db.query(
      'INSERT INTO users (id, username, phone, password_hash, credits) VALUES (?, ?, ?, ?, ?)',
      [userId, username, phone, '$2a$10$example', 100]
    );
    
    // 添加注册奖励积分记录
    await db.query(
      'INSERT INTO credit_transactions (id, user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?, ?)',
      [generateId('trans-'), userId, 'charge', 100, 100, '注册奖励']
    );
    
    const token = 'jwt-token-' + Date.now() + '-' + userId;
    
    // 存储用户会话
    userSessions.set(token, userId);
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      token: token,
      user: {
        id: userId,
        username: username,
        phone: phone,
        credits: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册服务异常，请稍后重试'
    });
  }
});

app.get('/api/user/profile', async (req, res) => {
  console.log('Received profile request');
  
  try {
    const user = await getCurrentUserFromToken(req);
    
    if (user) {
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          credits: user.credits,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户未登录或token无效'
      });
    }
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务异常，请稍后重试'
    });
  }
});

// Credits endpoints
app.post('/api/credits/charge', async (req, res) => {
  const { amount, credits } = req.body;
  
  console.log('Received charge request:', { amount, credits });
  
  try {
    const user = await getCurrentUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户未登录或token无效'
      });
    }
    
    const connection = await db.beginTransaction();
    
    try {
      // 更新用户积分
      const newCredits = user.credits + credits;
      await connection.execute(
        'UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newCredits, user.id]
      );
      
      // 添加充值记录
      const transactionId = generateId('trans-');
      await connection.execute(
        'INSERT INTO credit_transactions (id, user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionId, user.id, 'charge', credits, newCredits, `充值${amount}元`]
      );
      
      // 创建充值订单记录
      const orderId = generateId('order-');
      await connection.execute(
        'INSERT INTO charge_orders (id, user_id, amount, credits, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, user.id, amount, credits, 'alipay', 'completed']
      );
      
      await db.commitTransaction(connection);
      
      console.log('充值后用户积分:', newCredits);
      
      res.json({
        success: true,
        message: '充值成功',
        order: {
          id: orderId,
          amount,
          credits,
          status: 'completed'
        }
      });
    } catch (error) {
      await db.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    console.error('充值错误:', error);
    res.status(500).json({
      success: false,
      message: '充值服务异常，请稍后重试'
    });
  }
});

app.get('/api/credits/transactions', async (req, res) => {
  console.log('Received transactions request');
  
  try {
    const user = await getCurrentUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户未登录或token无效'
      });
    }
    
    const transactions = await db.query(
      'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [user.id]
    );
    
    // 转换数据格式以匹配前端期望
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      createdAt: t.created_at
    }));
    
    res.json({
      success: true,
      data: formattedTransactions
    });
  } catch (error) {
    console.error('获取交易记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务异常，请稍后重试'
    });
  }
});

app.post('/api/credits/consume', async (req, res) => {
  const { amount, description } = req.body;
  
  console.log('Received consume request:', { amount, description });
  
  try {
    const user = await getCurrentUserFromToken(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户未登录或token无效'
      });
    }
    
    if (user.credits < amount) {
      return res.status(400).json({
        success: false,
        message: '积分不足'
      });
    }
    
    const connection = await db.beginTransaction();
    
    try {
      // 更新用户积分
      const newCredits = user.credits - amount;
      await connection.execute(
        'UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newCredits, user.id]
      );
      
      // 添加消费记录
      const transactionId = generateId('trans-');
      await connection.execute(
        'INSERT INTO credit_transactions (id, user_id, type, amount, balance, description) VALUES (?, ?, ?, ?, ?, ?)',
        [transactionId, user.id, 'consume', amount, newCredits, description || '积分消费']
      );
      
      await db.commitTransaction(connection);
      
      res.json({
        success: true,
        balance: newCredits
      });
    } catch (error) {
      await db.rollbackTransaction(connection);
      throw error;
    }
  } catch (error) {
    console.error('积分消费错误:', error);
    res.status(500).json({
      success: false,
      message: '服务异常，请稍后重试'
    });
  }
});

// Catch all for unknown routes
app.use('*', (req, res) => {
  console.log('Unknown route:', req.method, req.originalUrl);
  res.status(404).json({ success: false, message: '接口不存在' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Nano-Bananary MySQL Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // 测试数据库连接
  const connected = await db.testConnection();
  if (connected) {
    console.log('✅ MySQL数据库连接正常');
  } else {
    console.log('❌ MySQL数据库连接失败');
  }
});