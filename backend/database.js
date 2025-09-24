const mysql = require('mysql2');

// 数据库配置
const dbConfig = {
  host: '39.101.165.84',
  port: 3307,
  user: 'root',
  password: '091211',
  database: 'banana',
  charset: 'utf8mb4',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 获取Promise版本的池连接
const promisePool = pool.promise();

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await promisePool.getConnection();
    console.log('MySQL数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL数据库连接失败:', error);
    return false;
  }
}

// 执行查询
async function query(sql, params = []) {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 开始事务
async function beginTransaction() {
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();
  return connection;
}

// 提交事务
async function commitTransaction(connection) {
  await connection.commit();
  connection.release();
}

// 回滚事务
async function rollbackTransaction(connection) {
  await connection.rollback();
  connection.release();
}

module.exports = {
  pool: promisePool,
  testConnection,
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};