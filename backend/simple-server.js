const express = require('express');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('./services/paymentService');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'demo-secret-key';

// In-memory database
let users = [];
let history = [];
let creditTransactions = []; // 积分交易记录
let chargeOrders = []; // 充值订单

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的认证令牌' });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API服务正常运行' });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, phone, password } = req.body;

    // Basic validation
    if (!username || !phone || !password) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // Check if user exists
    const existingUser = users.find(u => u.username === username || u.phone === phone);
    if (existingUser) {
      return res.status(409).json({ success: false, message: '用户名或手机号已存在' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const newUser = {
      id: userId,
      username,
      phone,
      password_hash: passwordHash,
      credits: 100, // 初始积分100
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    users.push(newUser);

    // 创建初始积分记录
    const initialCreditTransaction = {
      id: uuidv4(),
      userId: userId,
      type: 'charge',
      amount: 100,
      balance: 100,
      description: '注册奖励',
      createdAt: new Date().toISOString()
    };
    creditTransactions.push(initialCreditTransaction);

    // Generate token
    const token = generateToken(userId);

    // Return user data
    const userData = {
      id: userId,
      username,
      phone,
      credits: 100,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };

    res.status(201).json({
      success: true,
      user: userData,
      token,
      message: '注册成功'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginType, identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // Find user
    let user;
    if (loginType === 'username') {
      user = users.find(u => u.username === identifier);
    } else {
      user = users.find(u => u.phone === identifier);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user data
    const userData = {
      id: user.id,
      username: user.username,
      phone: user.phone,
      credits: user.credits || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({
      success: true,
      user: userData,
      token,
      message: '登录成功'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Get user profile
app.get('/api/user/profile', verifyToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      phone: user.phone,
      credits: user.credits || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({ success: true, user: userData });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Save history
app.post('/api/history', verifyToken, (req, res) => {
  try {
    const {
      type,
      originalImageUrl,
      resultImageUrl,
      resultVideoUrl,
      secondaryImageUrl,
      transformationKey,
      prompt
    } = req.body;

    if (!type || !transformationKey) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const historyId = uuidv4();
    const historyItem = {
      id: historyId,
      user_id: req.userId,
      type,
      original_image_url: originalImageUrl,
      result_image_url: resultImageUrl,
      result_video_url: resultVideoUrl,
      secondary_image_url: secondaryImageUrl,
      transformation_key: transformationKey,
      prompt,
      created_at: new Date().toISOString()
    };

    history.push(historyItem);

    res.status(201).json({
      success: true,
      historyId,
      message: '历史记录保存成功'
    });

  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Get user history
app.get('/api/history', verifyToken, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Filter history for current user
    const userHistory = history
      .filter(item => item.user_id === req.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + parseInt(limit));

    const total = history.filter(item => item.user_id === req.userId).length;

    // Format response
    const formattedHistory = userHistory.map(item => ({
      id: item.id,
      type: item.type,
      originalImageUrl: item.original_image_url,
      resultImageUrl: item.result_image_url,
      resultVideoUrl: item.result_video_url,
      secondaryImageUrl: item.secondary_image_url,
      transformationKey: item.transformation_key,
      prompt: item.prompt,
      createdAt: item.created_at
    }));

    res.json({
      success: true,
      history: formattedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Delete history item
app.delete('/api/history/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;

    const itemIndex = history.findIndex(item => item.id === id && item.user_id === req.userId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: '历史记录不存在' });
    }

    history.splice(itemIndex, 1);

    res.json({ success: true, message: '历史记录删除成功' });

  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Send verification code (mock)
app.post('/api/auth/send-verification-code', (req, res) => {
  const { phone, type } = req.body;
  
  if (!phone || !type) {
    return res.status(400).json({ success: false, message: '参数不完整' });
  }

  // Mock verification code
  const code = '123456';
  console.log(`Mock verification code for ${phone}: ${code}`);

  res.json({
    success: true,
    message: '验证码已发送',
    code: code // Only for demo
  });
});

// 消费积分（生成图像时调用）
app.post('/api/credits/consume', verifyToken, (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '消费金额无效' });
    }

    const user = users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (user.credits < amount) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // 扣除积分
    user.credits -= amount;
    user.updated_at = new Date().toISOString();

    // 记录消费明细
    const transaction = {
      id: uuidv4(),
      userId: req.userId,
      type: 'consume',
      amount: -amount,
      balance: user.credits,
      description: description || '生成图像',
      createdAt: new Date().toISOString()
    };
    creditTransactions.push(transaction);

    res.json({
      success: true,
      credits: user.credits,
      message: '积分消费成功'
    });

  } catch (error) {
    console.error('Consume credits error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取积分明细
app.get('/api/credits/transactions', verifyToken, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const userTransactions = creditTransactions
      .filter(t => t.userId === req.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + parseInt(limit));

    const total = creditTransactions.filter(t => t.userId === req.userId).length;

    res.json({
      success: true,
      transactions: userTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 创建充值订单
app.post('/api/credits/charge', verifyToken, async (req, res) => {
  try {
    const { amount, credits, paymentMethod } = req.body;
    
    if (!amount || !credits || !paymentMethod) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    if (!['alipay', 'wechat'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: '不支持的支付方式' });
    }

    const orderId = `ORDER_${Date.now()}_${uuidv4().substr(0, 8)}`;
    const order = {
      id: orderId,
      userId: req.userId,
      amount: parseFloat(amount),
      credits: parseInt(credits),
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    chargeOrders.push(order);

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    
    let paymentResult;
    
    if (paymentMethod === 'alipay') {
      // 创建支付宝支付订单
      paymentResult = await paymentService.createAlipayOrder(
        orderId,
        amount,
        `积分充值-${credits}积分`,
        `用户充值${amount}元获得${credits}积分`
      );
    } else if (paymentMethod === 'wechat') {
      // 创建微信支付订单
      paymentResult = await paymentService.createWechatOrder(
        orderId,
        amount,
        `积分充值-${credits}积分`,
        `用户充值${amount}元获得${credits}积分`,
        clientIp
      );
    }

    if (paymentResult.success) {
      res.json({
        success: true,
        orderId,
        paymentUrl: paymentResult.paymentUrl,
        qrCodeUrl: paymentResult.qrCodeUrl,
        message: '订单创建成功，请完成支付'
      });
    } else {
      res.status(500).json({
        success: false,
        message: paymentResult.message || '创建支付订单失败'
      });
    }

  } catch (error) {
    console.error('Create charge order error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 支付宝支付回调
app.post('/api/payment/alipay/notify', async (req, res) => {
  try {
    console.log('支付宝回调:', req.body);
    
    // 验证签名
    const isValid = paymentService.verifyAlipayNotify(req.body);
    if (!isValid) {
      console.error('支付宝回调签名验证失败');
      return res.send('fail');
    }

    const { out_trade_no: orderId, trade_status } = req.body;
    
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await processPaymentSuccess(orderId, 'alipay');
    }
    
    res.send('success');
  } catch (error) {
    console.error('支付宝回调处理失败:', error);
    res.send('fail');
  }
});

// 微信支付回调
app.post('/api/payment/wechat/notify', async (req, res) => {
  try {
    console.log('微信支付回调:', req.body);
    
    // 解析XML
    const xmlData = req.body;
    const result = paymentService.parseXml(xmlData);
    
    // 验证签名
    const isValid = paymentService.verifyWechatNotify(result);
    if (!isValid) {
      console.error('微信支付回调签名验证失败');
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>');
    }

    const { out_trade_no: orderId, result_code } = result;
    
    if (result_code === 'SUCCESS') {
      await processPaymentSuccess(orderId, 'wechat');
    }
    
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } catch (error) {
    console.error('微信支付回调处理失败:', error);
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>');
  }
});

// 处理支付成功逻辑
async function processPaymentSuccess(orderId, paymentMethod) {
  try {
    const order = chargeOrders.find(o => o.id === orderId);
    if (!order) {
      console.error('订单不存在:', orderId);
      return;
    }

    if (order.status !== 'pending') {
      console.log('订单已处理:', orderId);
      return;
    }

    // 更新订单状态
    order.status = 'paid';
    order.paidAt = new Date().toISOString();

    // 增加用户积分
    const user = users.find(u => u.id === order.userId);
    if (user) {
      user.credits += order.credits;
      user.updated_at = new Date().toISOString();

      // 记录充值明细
      const transaction = {
        id: uuidv4(),
        userId: order.userId,
        type: 'charge',
        amount: order.credits,
        balance: user.credits,
        description: `${paymentMethod === 'alipay' ? '支付宝' : '微信'}支付充值${order.amount}元`,
        orderId: orderId,
        createdAt: new Date().toISOString()
      };
      creditTransactions.push(transaction);
      
      console.log(`用户${user.username}充值成功，获得${order.credits}积分，当前余额：${user.credits}`);
    }
  } catch (error) {
    console.error('处理支付成功逻辑失败:', error);
  }
}

// 查询订单状态
app.get('/api/payment/order/:orderId', verifyToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const order = chargeOrders.find(o => o.id === orderId && o.userId === req.userId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        credits: order.credits,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt
      }
    });
  } catch (error) {
    console.error('查询订单状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户信息
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const { username, phone, password, currentPassword } = req.body;
    
    const user = users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 如果要修改密码，需要验证当前密码
    if (password && currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ success: false, message: '当前密码错误' });
      }
      user.password_hash = await bcrypt.hash(password, 10);
    }

    // 更新其他信息
    if (username && username !== user.username) {
      // 检查用户名是否已存在
      const existingUser = users.find(u => u.username === username && u.id !== req.userId);
      if (existingUser) {
        return res.status(409).json({ success: false, message: '用户名已存在' });
      }
      user.username = username;
    }

    if (phone && phone !== user.phone) {
      // 检查手机号是否已存在
      const existingUser = users.find(u => u.phone === phone && u.id !== req.userId);
      if (existingUser) {
        return res.status(409).json({ success: false, message: '手机号已存在' });
      }
      user.phone = phone;
    }

    user.updated_at = new Date().toISOString();

    const userData = {
      id: user.id,
      username: user.username,
      phone: user.phone,
      credits: user.credits || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.json({
      success: true,
      user: userData,
      message: '信息更新成功'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});