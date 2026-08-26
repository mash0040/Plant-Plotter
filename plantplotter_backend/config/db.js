const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value.toString().trim().toLowerCase() === 'true';
};

const dbPort = Number.parseInt(process.env.DB_PORT || '3306', 10);
const useSsl = parseBooleanEnv(process.env.DB_SSL, false);
const rejectUnauthorized = parseBooleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
const sslCaPath = process.env.DB_SSL_CA_PATH;

const poolConfig = {
  host: process.env.DB_HOST,
  port: Number.isNaN(dbPort) ? 3306 : dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 30000
};

if (useSsl) {
  poolConfig.ssl = {
    rejectUnauthorized
  };

  if (sslCaPath) {
    poolConfig.ssl.ca = fs.readFileSync(sslCaPath, 'utf8');
  }
}

const pool = mysql.createPool(poolConfig);

// Keep connections alive
setInterval(async () => {
  try {
    await pool.execute('SELECT 1');
  } catch (err) {
    console.error('Keep-alive ping failed:', err.message);
  }
}, 60000);

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