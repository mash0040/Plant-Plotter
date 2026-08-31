const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_DATABASE_POOL_SETTINGS,
  buildDatabasePoolConfig,
  parseBooleanEnv,
  parsePositiveIntegerEnv
} = require('../config/databasePoolConfig');

const baseEnv = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USER: 'garden_user',
  DB_PASSWORD: 'garden_password',
  DB_NAME: 'garden_plotter',
  DB_SSL: 'false',
  DB_SSL_REJECT_UNAUTHORIZED: 'true',
  DB_SSL_CA_PATH: ''
};

test('parses boolean database environment values', () => {
  assert.equal(parseBooleanEnv(undefined, true), true);
  assert.equal(parseBooleanEnv('', true), true);
  assert.equal(parseBooleanEnv('true'), true);
  assert.equal(parseBooleanEnv(' TRUE '), true);
  assert.equal(parseBooleanEnv('false'), false);
  assert.equal(parseBooleanEnv('1'), false);
});

test('parses positive integer database environment values with safe fallbacks', () => {
  assert.equal(parsePositiveIntegerEnv('25', 10), 25);
  assert.equal(parsePositiveIntegerEnv('0', 10), 10);
  assert.equal(parsePositiveIntegerEnv('-1', 10), 10);
  assert.equal(parsePositiveIntegerEnv('not-a-number', 10), 10);
  assert.equal(parsePositiveIntegerEnv(undefined, 10), 10);
});

test('builds bounded default MySQL pool settings', () => {
  const poolConfig = buildDatabasePoolConfig({ env: baseEnv });

  assert.equal(poolConfig.host, 'localhost');
  assert.equal(poolConfig.port, 3306);
  assert.equal(poolConfig.charset, 'utf8mb4');
  assert.equal(poolConfig.connectionLimit, DEFAULT_DATABASE_POOL_SETTINGS.connectionLimit);
  assert.equal(poolConfig.maxIdle, DEFAULT_DATABASE_POOL_SETTINGS.connectionLimit);
  assert.equal(poolConfig.queueLimit, DEFAULT_DATABASE_POOL_SETTINGS.queueLimit);
  assert.equal(poolConfig.connectTimeout, DEFAULT_DATABASE_POOL_SETTINGS.connectTimeout);
  assert.equal(poolConfig.idleTimeout, DEFAULT_DATABASE_POOL_SETTINGS.idleTimeout);
  assert.equal(poolConfig.waitForConnections, true);
  assert.equal(poolConfig.enableKeepAlive, true);
  assert.equal(poolConfig.keepAliveInitialDelay, 0);
  assert.equal(poolConfig.ssl, undefined);
});

test('uses explicit finite pool settings from the environment', () => {
  const poolConfig = buildDatabasePoolConfig({
    env: {
      ...baseEnv,
      DB_PORT: '3307',
      DB_CONNECTION_LIMIT: '7',
      DB_QUEUE_LIMIT: '21',
      DB_CONNECT_TIMEOUT_MS: '15000',
      DB_IDLE_TIMEOUT_MS: '45000'
    }
  });

  assert.equal(poolConfig.port, 3307);
  assert.equal(poolConfig.connectionLimit, 7);
  assert.equal(poolConfig.maxIdle, 7);
  assert.equal(poolConfig.queueLimit, 21);
  assert.equal(poolConfig.connectTimeout, 15000);
  assert.equal(poolConfig.idleTimeout, 45000);
});

test('does not allow invalid values to create an unbounded queue or invalid limits', () => {
  const poolConfig = buildDatabasePoolConfig({
    env: {
      ...baseEnv,
      DB_CONNECTION_LIMIT: '0',
      DB_QUEUE_LIMIT: '0',
      DB_CONNECT_TIMEOUT_MS: '-100',
      DB_IDLE_TIMEOUT_MS: 'nope'
    }
  });

  assert.equal(poolConfig.connectionLimit, DEFAULT_DATABASE_POOL_SETTINGS.connectionLimit);
  assert.equal(poolConfig.queueLimit, DEFAULT_DATABASE_POOL_SETTINGS.queueLimit);
  assert.equal(poolConfig.connectTimeout, DEFAULT_DATABASE_POOL_SETTINGS.connectTimeout);
  assert.equal(poolConfig.idleTimeout, DEFAULT_DATABASE_POOL_SETTINGS.idleTimeout);
});

test('production database TLS remains fail-closed', () => {
  assert.throws(
    () => buildDatabasePoolConfig({
      env: {
        ...baseEnv,
        NODE_ENV: 'production',
        DB_SSL: 'false',
        DB_SSL_CA_PATH: ''
      }
    }),
    /Production database connections require verified TLS/
  );

  assert.throws(
    () => buildDatabasePoolConfig({
      env: {
        ...baseEnv,
        NODE_ENV: 'production',
        DB_SSL: 'true',
        DB_SSL_REJECT_UNAUTHORIZED: 'false',
        DB_SSL_CA_PATH: '/etc/secrets/aiven-ca.pem'
      }
    }),
    /Production database connections require verified TLS/
  );
});

test('production database TLS loads the configured CA certificate', () => {
  const poolConfig = buildDatabasePoolConfig({
    env: {
      ...baseEnv,
      NODE_ENV: 'production',
      DB_SSL: 'true',
      DB_SSL_REJECT_UNAUTHORIZED: 'true',
      DB_SSL_CA_PATH: '/etc/secrets/aiven-ca.pem'
    },
    readFileSync: (filePath, encoding) => {
      assert.equal(filePath, '/etc/secrets/aiven-ca.pem');
      assert.equal(encoding, 'utf8');
      return 'test-ca-certificate';
    }
  });

  assert.deepEqual(poolConfig.ssl, {
    rejectUnauthorized: true,
    ca: 'test-ca-certificate'
  });
});
