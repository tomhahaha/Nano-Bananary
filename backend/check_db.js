const db = require('./database');

async function checkTables() {
  try {
    console.log('检查数据库表状态...');
    
    // 查看所有表
    const tables = await db.query('SHOW TABLES');
    console.log('数据库中的表:', tables.map(t => Object.values(t)[0]));
    
    // 检查用户表
    const users = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('用户表记录数:', users[0].count);
    
    // 检查积分交易表
    const transactions = await db.query('SELECT COUNT(*) as count FROM credit_transactions');
    console.log('积分交易表记录数:', transactions[0].count);
    
    console.log('✅ 数据库检查完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    process.exit(1);
  }
}

checkTables();