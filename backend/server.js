const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory database (for demo purposes)
let database = {
  users: [],
  history: [],
  verificationCodes: []
};

// Database file path
const dbFilePath = path.join(__dirname, 'database.json');

// Load database from file if it exists
if (fs.existsSync(dbFilePath)) {
  try {
    const data = fs.readFileSync(dbFilePath, 'utf8');
    database = JSON.parse(data);
    console.log('Database loaded from file');
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Save database to file
const saveDatabase = () => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Auto-save every 30 seconds
setInterval(saveDatabase, 30000);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  captcha: Joi.string().required()
});

const loginSchema = Joi.object({
  loginType: Joi.string().valid('phone', 'username').required(),
  identifier: Joi.string().required(),
  password: Joi.string().when('loginType', {
    is: 'username',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  verificationCode: Joi.string().when('loginType', {
    is: 'phone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  captcha: Joi.string().required()
});

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

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API服务正常运行' });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { username, phone, password } = value;

    // Check if user exists
    const existingUser = database.users.find(u => u.username === username || u.phone === phone);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: '用户名或手机号已存在' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const newUser = {
      id: userId,
      username,
      phone,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    database.users.push(newUser);
    saveDatabase();

    // Generate token
    const token = generateToken(userId);

    // Get user data
    const user = {
      id: userId,
      username,
      phone,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };

    res.status(201).json({
      success: true,
      user,
      token,
      message: '注册成功'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { loginType, identifier, password, verificationCode } = value;

    let user;
    if (loginType === 'username') {
      // Username + password login
      user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM users WHERE username = ?',
          [identifier],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: '用户名或密码错误' 
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: '用户名或密码错误' 
        });
      }

    } else {
      // Phone + verification code login
      user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM users WHERE phone = ?',
          [identifier],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: '手机号不存在' 
        });
      }

      // Verify verification code
      const validCode = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND type = ? AND used = 0 AND expires_at > datetime("now")',
          [identifier, verificationCode, 'login'],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (!validCode) {
        return res.status(401).json({ 
          success: false, 
          message: '验证码无效或已过期' 
        });
      }

      // Mark verification code as used
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE verification_codes SET used = 1 WHERE id = ?',
          [validCode.id],
          (err) => {
            if (err) reject(err);
            resolve();
          }
        );
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Clean user data
    const userData = {
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
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
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Send verification code
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { phone, type } = req.body;

    if (!phone || !type) {
      return res.status(400).json({ 
        success: false, 
        message: '参数不完整' 
      });
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: '手机号格式不正确' 
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save verification code
    const codeId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO verification_codes (id, phone, code, type, expires_at) VALUES (?, ?, ?, ?, ?)',
        [codeId, phone, code, type, expiresAt.toISOString()],
        function(err) {
          if (err) reject(err);
          resolve(this);
        }
      );
    });

    // In a real application, you would send the SMS here
    console.log(`Verification code for ${phone}: ${code}`);

    res.json({
      success: true,
      message: '验证码已发送',
      // Development only - remove in production
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Get user profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, phone, email, avatar, created_at, updated_at FROM users WHERE id = ?',
        [req.userId],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Save history
app.post('/api/history', verifyToken, async (req, res) => {
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
      return res.status(400).json({ 
        success: false, 
        message: '参数不完整' 
      });
    }

    const historyId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO history (
          id, user_id, type, original_image_url, result_image_url, 
          result_video_url, secondary_image_url, transformation_key, prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId, req.userId, type, originalImageUrl, resultImageUrl,
          resultVideoUrl, secondaryImageUrl, transformationKey, prompt
        ],
        function(err) {
          if (err) reject(err);
          resolve(this);
        }
      );
    });

    res.status(201).json({
      success: true,
      historyId,
      message: '历史记录保存成功'
    });

  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Get user history
app.get('/api/history', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM history 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [req.userId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM history WHERE user_id = ?',
        [req.userId],
        (err, row) => {
          if (err) reject(err);
          resolve(row.count);
        }
      );
    });

    res.json({
      success: true,
      history: history.map(item => ({
        id: item.id,
        type: item.type,
        originalImageUrl: item.original_image_url,
        resultImageUrl: item.result_image_url,
        resultVideoUrl: item.result_video_url,
        secondaryImageUrl: item.secondary_image_url,
        transformationKey: item.transformation_key,
        prompt: item.prompt,
        createdAt: item.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Delete history item
app.delete('/api/history/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM history WHERE id = ? AND user_id = ?',
        [id, req.userId],
        function(err) {
          if (err) reject(err);
          resolve(this);
        }
      );
    });

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '历史记录不存在' 
      });
    }

    res.json({
      success: true,
      message: '历史记录删除成功'
    });

  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});