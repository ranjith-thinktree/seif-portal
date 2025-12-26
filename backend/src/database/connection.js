const mysql = require('mysql2/promise');
const config = require('../config');

// Create connection pool
const pool = mysql.createPool(config.database);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Database connection failed:', error.message);
    return false;
  }
};

// Get connection from pool
const getConnection = async () => {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
};

// Execute query with automatic connection management
const query = async (sql, params = []) => {
  const connection = await getConnection();
  try {
    // Return [results, fields] to match mysql2 promise format
    // This allows destructuring: const [rows] = await db.query(...)
    const result = await connection.execute(sql, params);
    return result; // Returns [rows, fields] array
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Execute transaction
const transaction = async (callback) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Close pool (for graceful shutdown)
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ MySQL connection pool closed');
  } catch (error) {
    console.error('Error closing MySQL pool:', error);
  }
};

module.exports = {
  pool,
  testConnection,
  getConnection,
  query,
  transaction,
  closePool,
};
