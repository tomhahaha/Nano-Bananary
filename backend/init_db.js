const db = require('./database');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    console.log('开始初始化MySQL数据库...');
    
    // 测试数据库连接
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('无法连接到数据库');
    }
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'init_database.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 分割SQL语句（以分号为分隔符）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
    
    // 执行每个SQL语句
    for (const sql of sqlStatements) {
      if (sql.trim()) {
        try {
          await db.query(sql);
          console.log('✓ 执行SQL成功:', sql.substring(0, 50).replace(/\s+/g, ' ') + '...');
        } catch (error) {
          // 忽略一些可以预期的错误（如重复插入）
          if (error.code === 'ER_DUP_ENTRY') {
            console.log('- 数据已存在，跳过:', sql.substring(0, 50).replace(/\s+/g, ' ') + '...');
          } else {
            console.error('✗ 执行SQL失败:', sql.substring(0, 50).replace(/\s+/g, ' ') + '...');
            console.error('错误:', error.message);
          }
        }
      }
    }
    
    console.log('✅ 数据库初始化完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initDatabase();