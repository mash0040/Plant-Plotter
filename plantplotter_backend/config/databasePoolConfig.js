const fs = require('fs');

const DEFAULT_DATABASE_POOL_SETTINGS = {
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 30000,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value.toString().trim().toLowerCase() === 'true';
};

const parsePositiveIntegerEnv = (value, defaultValue) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return defaultValue;
  }

  return parsedValue;
};

const buildDatabasePoolConfig = ({
  env = process.env,
  readFileSync = fs.readFileSync
} = {}) => {
  const dbPort = parsePositiveIntegerEnv(env.DB_PORT, 3306);
  const useSsl = parseBooleanEnv(env.DB_SSL, false);
  const rejectUnauthorized = parseBooleanEnv(env.DB_SSL_REJECT_UNAUTHORIZED, true);
  const sslCaPath = env.DB_SSL_CA_PATH;
  const connectionLimit = parsePositiveIntegerEnv(
    env.DB_CONNECTION_LIMIT,
    DEFAULT_DATABASE_POOL_SETTINGS.connectionLimit
  );

  if (
    env.NODE_ENV === 'production' &&
    (!useSsl || !rejectUnauthorized || !sslCaPath)
  ) {
    throw new Error(
      'Production database connections require verified TLS and a trusted CA certificate.'
    );
  }

  const poolConfig = {
    host: env.DB_HOST,
    port: dbPort,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit,
    maxIdle: connectionLimit,
    idleTimeout: parsePositiveIntegerEnv(
      env.DB_IDLE_TIMEOUT_MS,
      DEFAULT_DATABASE_POOL_SETTINGS.idleTimeout
    ),
    waitForConnections: true,
    queueLimit: parsePositiveIntegerEnv(
      env.DB_QUEUE_LIMIT,
      DEFAULT_DATABASE_POOL_SETTINGS.queueLimit
    ),
    connectTimeout: parsePositiveIntegerEnv(
      env.DB_CONNECT_TIMEOUT_MS,
      DEFAULT_DATABASE_POOL_SETTINGS.connectTimeout
    ),
    enableKeepAlive: DEFAULT_DATABASE_POOL_SETTINGS.enableKeepAlive,
    keepAliveInitialDelay: DEFAULT_DATABASE_POOL_SETTINGS.keepAliveInitialDelay
  };

  if (useSsl) {
    poolConfig.ssl = {
      rejectUnauthorized
    };

    if (sslCaPath) {
      poolConfig.ssl.ca = readFileSync(sslCaPath, 'utf8');
    }
  }

  return poolConfig;
};

module.exports = {
  DEFAULT_DATABASE_POOL_SETTINGS,
  buildDatabasePoolConfig,
  parseBooleanEnv,
  parsePositiveIntegerEnv
};
