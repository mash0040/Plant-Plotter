const mysql = require('mysql2/promise');
const { buildDatabasePoolConfig } = require('./databasePoolConfig');
require('dotenv').config();

const pool = mysql.createPool(buildDatabasePoolConfig());

// Test the connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
})();

module.exports = pool;
