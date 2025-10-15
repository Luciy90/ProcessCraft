// Пул подключений к базе данных SQL Server 2008
require('dotenv').config();
const sql = require('mssql');
const { getUserCredentials, verifyUserCredentials } = require('./auth-service');

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

// Функция для загрузки учетных данных на основе типа пользователя
async function loadCredentials(userType = 'regular') {
  try {
    // Создаем новую конфигурацию для каждого вызова
    const config = createConfig();
    
    // Если установлены переменные окружения, используем их напрямую (наивысший приоритет)
    if (userType === 'regular' && process.env.DB_USER_REGULAR) {
      config.user = process.env.DB_USER_REGULAR;
      if (process.env.DB_PASSWORD_REGULAR) {
        config.password = process.env.DB_PASSWORD_REGULAR;
        console.log(`Использование учетных данных из переменных окружения для ${userType}`);
        return config;
      }
    }
    // Для суперадмина используем переменные окружения
    else if (userType === 'superadmin' && process.env.DB_USER_ADMIN) {
      config.user = process.env.DB_USER_ADMIN;
      if (process.env.DB_PASSWORD_ADMIN) {
        config.password = process.env.DB_PASSWORD_ADMIN;
        console.log(`Использование учетных данных из переменных окружения для ${userType}`);
        return config;
      }
    }
    
    // Для подключения к SQL Server нам нужны учетные данные
    // В реальной реализации мы бы получали их из безопасного хранилища
    // Сейчас используем учетные данные по умолчанию
    console.log(`Использование учетных данных по умолчанию для ${userType}`);
    
    // Определяем учетные данные в зависимости от типа пользователя
    if (userType === 'superadmin') {
      config.user = 'AppSuperAdmin';
      config.password = 'aA3$!Qp9_superAdminStrongPwd';
    } else {
      config.user = 'AppSuperUser';
      config.password = 'uU7@#Kx2_superUserStrongPwd';
    }
    
    return config;
  } catch (error) {
    console.error('Не удалось загрузить учетные данные:', error);
    
    // Откат к значениям по умолчанию
    const config = createConfig();
    config.user = 'AppSuperUser';
    config.password = 'uU7@#Kx2_superUserStrongPwd';
    console.log('Использование учетных данных по умолчанию для обычного пользователя');
    
    return config;
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
  loadCredentials,
  // Экспортируем функции аутентификации для использования в других модулях
  getUserCredentials,
  verifyUserCredentials
};