// Пул подключений к базе данных SQL Server 2008
require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { verifyDatabaseCredentials } = require('./setup-db-access');

// Путь к базе данных аутентификации
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');

// Объект конфигурации для SQL Server
// Проверяем, содержит ли сервер имя экземпляра или порт
const serverConfig = process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS';

// Функция для создания новой конфигурации для каждого подключения
function createConfig() {
  return {
    server: serverConfig.split(',')[0], // Извлекаем имя сервера
    database: process.env.DB_DATABASE || 'ProcessCraftDB',
    options: {
      encrypt: false, // Требуется для совместимости с SQL Server 2008
      trustServerCertificate: true, // В производственной среде измените на false, если используются надежные сертификаты
      // Если указан порт, используем его, иначе используем порт по умолчанию
      port: serverConfig.includes(',') ? parseInt(serverConfig.split(',')[1]) : 1433
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
    // Читаем auth-db.json
    if (!fs.existsSync(AUTH_DB_FILE)) {
      throw new Error('Файл auth-db.json не найден');
    }
    
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Для суперадмина используем пользователя AppSuperAdmin
    if (userType === 'superadmin') {
      const adminUsername = process.env.DB_USER_ADMIN || 'AppSuperAdmin';
      const adminPassword = process.env.DB_PASSWORD_ADMIN || 'aA3$!Qp9_superAdminStrongPwd';
      
      // Проверяем учетные данные через хеши
      if (verifyDatabaseCredentials(
        process.env.DB_SERVER || 'OZO-62,1433',
        process.env.DB_DATABASE || 'ProcessCraftBD',
        adminUsername,
        adminPassword
      )) {
        return {
          username: adminUsername,
          password: adminPassword
        };
      }
    }
    // Для обычного пользователя используем пользователя AppSuperUser
    else if (userType === 'regular') {
      const regularUsername = process.env.DB_USER_REGULAR || 'AppSuperUser';
      const regularPassword = process.env.DB_PASSWORD_REGULAR || 'uU7@!Kx2_superUserStrongPwd';
      
      // Проверяем учетные данные через хеши
      if (verifyDatabaseCredentials(
        process.env.DB_SERVER || 'OZO-62,1433',
        process.env.DB_DATABASE || 'ProcessCraftBD',
        regularUsername,
        regularPassword
      )) {
        return {
          username: regularUsername,
          password: regularPassword
        };
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

// Создание пула подключений с учетными данными обычного пользователя по умолчанию
let poolPromise;

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
    
    return pool;
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err);
    throw err;
  }
}

// Инициализация с обычным пользователем по умолчанию
poolPromise = initializeConnection();

// Экспорт пула и библиотеки sql
module.exports = {
  sql,
  poolPromise,
  initializeConnection,
  loadCredentials
};