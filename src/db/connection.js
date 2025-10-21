// Пул подключений к базе данных SQL Server 2008
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { verifyDatabaseCredentials } = require('./setup-db-access');
const { decrypt } = require('./encryption');

// Путь к базе данных аутентификации
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');

// Объект конфигурации для SQL Server из зашифрованных значений
// Сервер и база берутся из auth-db.json -> encrypted_config
let encryptedConfigCache = null;
function getEncryptedConfig() {
  if (!encryptedConfigCache) {
    if (!fs.existsSync(AUTH_DB_FILE)) {
      throw new Error('Файл auth-db.json не найден');
    }
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    if (!authDb.encrypted_config) {
      throw new Error('В auth-db.json отсутствует раздел encrypted_config. Запустите setup-db-access.js');
    }
    encryptedConfigCache = authDb.encrypted_config;
  }
  return encryptedConfigCache;
}

// Функция для создания новой конфигурации для каждого подключения
function createConfig() {
  const enc = getEncryptedConfig();
  const serverPlain = decrypt(enc.server);
  const databasePlain = decrypt(enc.database);
  const serverStr = serverPlain;
  return {
    server: serverStr.split(',')[0],
    database: databasePlain,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      port: serverStr.includes(',') ? parseInt(serverStr.split(',')[1]) : 1433
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

// Функция для получения учетных данных пользователя по типу
function getUserCredentialsFromAuthDb(userType) {
  try {
    const enc = getEncryptedConfig();
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    const server = decrypt(enc.server);
    const database = decrypt(enc.database);

    if (userType === 'superadmin') {
      const adminEnc = enc.users['AppSuperAdmin'];
      const adminUsername = decrypt(adminEnc.username);
      const adminPassword = decrypt(adminEnc.password);
      if (verifyDatabaseCredentials(server, database, adminUsername, adminPassword)) {
        return { username: adminUsername, password: adminPassword };
      }
    } else if (userType === 'regular') {
      const regularEnc = enc.users['AppSuperUser'];
      const regularUsername = decrypt(regularEnc.username);
      const regularPassword = decrypt(regularEnc.password);
      if (verifyDatabaseCredentials(server, database, regularUsername, regularPassword)) {
        return { username: regularUsername, password: regularPassword };
      }
    }
    
    throw new Error(`Не найдены учетные данные для типа пользователя: ${userType}`);
  } catch (error) {
    console.error('Ошибка при получении учетных данных:', error.message);
    throw error;
  }
}

// Функция для загрузки учетных данных на основе типа пользователя
async function loadCredentials(userType = 'regular') {
  try {
    // Создаем новую конфигурацию для каждого вызова
    const config = createConfig();
    
    // Получаем учетные данные из auth-db.json
    const credentials = getUserCredentialsFromAuthDb(userType);
    config.user = credentials.username;
    config.password = credentials.password;
    
    console.log(`Использование учетных данных для ${userType} из auth-db.json`);
    return config;
  } catch (error) {
    console.error('Не удалось загрузить учетные данные:', error);
    throw error;
  }
}

// Проверка обязательных переменных окружения
const validateConfig = () => {
  const requiredVars = ['DB_SERVER', 'DB_DATABASE'];
  const missingVars = requiredVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.warn(`Предупреждение: Отсутствуют переменные окружения: ${missingVars.join(', ')}. Использование значений по умолчанию.`);
  }
};

// Проверка конфигурации при загрузке
validateConfig();

// Пулы подключений для разных типов пользователей
let regularPool = null;
let adminPool = null;

// Инициализация подключения с учетными данными
async function initializeConnection(userType = 'regular') {
  const configWithCredentials = await loadCredentials(userType);
  
  const pool = new sql.ConnectionPool(configWithCredentials);
  
  try {
    await pool.connect();
    console.log(`Успешное подключение к базе данных SQL Server в качестве ${userType} (${configWithCredentials.user})`);
    
    // Проверяем подключение с помощью простого запроса
    await pool.request().query('SELECT 1 AS connected');
    console.log('Подключение к базе данных успешно проверено');
    
    // Сохраняем пул в зависимости от типа пользователя
    if (userType === 'regular') {
      regularPool = pool;
    } else if (userType === 'superadmin') {
      adminPool = pool;
    }
    
    return pool;
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err);
    throw err;
  }
}

// Функция для получения соответствующего пула в зависимости от типа подключения
async function getConnectionPool(connectionType = 'regular') {
  // Инициализируем пулы, если они не существуют
  if (connectionType === 'superadmin' && !adminPool) {
    adminPool = await initializeConnection('superadmin');
  } else if (connectionType === 'regular' && !regularPool) {
    regularPool = await initializeConnection('regular');
  }
  
  // Возвращаем соответствующий пул
  return connectionType === 'superadmin' ? adminPool : regularPool;
}

// Экспорт пула и библиотеки sql
module.exports = {
  sql,
  initializeConnection,
  loadCredentials,
  getConnectionPool
};