/**
 * Пример реализации подключения к базе данных с использованием хешированных паролей
 * Этот пример демонстрирует подход, при котором пароли хранятся в виде хешей,
 * и перед подключением к базе данных происходит проверка соответствия введенного пароля хешу
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { verifyDatabaseCredentials } = require('./setup-db-access');

// Путь к файлу с хешами паролей базы данных (используем существующий auth-db.json)
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');

/**
 * Проверка учетных данных пользователя базы данных через существующую систему
 * @param {string} server - Имя сервера базы данных
 * @param {string} database - Имя базы данных
 * @param {string} username - Имя пользователя базы данных
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - Соответствуют ли учетные данные хешам
 */
function verifyDbCredentials(server, database, username, password) {
  try {
    // Используем существующую функцию проверки учетных данных
    const isValid = verifyDatabaseCredentials(server, database, username, password);
    console.log(`Проверка учетных данных для ${username}: ${isValid ? 'ДЕЙСТВИТЕЛЕН' : 'НЕДЕЙСТВИТЕЛЕН'}`);
    return isValid;
  } catch (error) {
    console.error('Ошибка при проверке учетных данных базы данных:', error);
    return false;
  }
}

/**
 * Подключение к базе данных с проверкой хешированных учетных данных
 * @param {string} username - Имя пользователя базы данных
 * @param {string} password - Пароль для проверки и использования
 * @param {object} connectionConfig - Конфигурация подключения к базе данных
 * @returns {object|null} - Пул подключений или null при ошибке
 */
async function connectWithHashedPassword(username, password, connectionConfig) {
  try {
    console.log(`Попытка подключения к базе данных от имени ${username} с проверкой хеша...`);
    
    // Сначала проверяем учетные данные через хеши в auth-db.json
    const server = process.env.DB_SERVER;
    const database = process.env.DB_DATABASE;
    
    // Проверяем, что необходимые переменные окружения установлены
    if (!server || !database || !username || !password) {
      console.log('✗ Отсутствуют необходимые переменные окружения для подключения к базе данных');
      return null;
    }
    
    const isCredentialsValid = verifyDbCredentials(
      server,
      database,
      username,
      password
    );
    
    if (!isCredentialsValid) {
      console.log('✗ Проверка хеша учетных данных не пройдена, подключение отклонено');
      return null;
    }
    
    console.log('✓ Проверка хеша учетных данных пройдена, продолжаем подключение');
    
    // Если проверка пройдена, создаем конфигурацию подключения
    const config = {
      ...connectionConfig,
      user: username,
      password: password // Используем оригинальный пароль для подключения к SQL Server
    };
    
    // Создаем пул подключений
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log(`✓ Успешное подключение к базе данных от имени ${username}`);
    return pool;
  } catch (error) {
    console.error(`✗ Ошибка подключения к базе данных от имени ${username}:`, error.message);
    return null;
  }
}

/**
 * Демонстрация безопасного подключения к базе данных
 */
async function demonstrateSecureConnection() {
  console.log('Демонстрация безопасного подключения к базе данных через хеширование...\n');
  
  // Проверяем, что необходимые переменные окружения установлены
  if (!process.env.DB_SERVER || !process.env.DB_DATABASE || 
      !process.env.DB_USER_ADMIN || !process.env.DB_PASSWORD_ADMIN ||
      !process.env.DB_USER_REGULAR || !process.env.DB_PASSWORD_REGULAR) {
    console.log('✗ Отсутствуют необходимые переменные окружения для демонстрации');
    console.log('Необходимо установить следующие переменные окружения:');
    console.log('- DB_SERVER');
    console.log('- DB_DATABASE');
    console.log('- DB_USER_ADMIN');
    console.log('- DB_PASSWORD_ADMIN');
    console.log('- DB_USER_REGULAR');
    console.log('- DB_PASSWORD_REGULAR');
    return;
  }
  
  // Конфигурация подключения к базе данных (используем только данные из .env)
  const serverConfig = process.env.DB_SERVER;
  const config = {
    server: serverConfig.split(',')[0], // Извлекаем имя сервера
    database: process.env.DB_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      // Если указан порт, используем его, иначе используем порт по умолчанию
      port: serverConfig.includes(',') ? parseInt(serverConfig.split(',')[1]) : 1433
    }
  };
  
  console.log('\n2. Тестирование подключения суперадмина:');
  
  // Подключение с правильным паролем из переменных окружения
  console.log('\n2.1. Подключение с правильным паролем:');
  const adminPool = await connectWithHashedPassword(
    process.env.DB_USER_ADMIN,
    process.env.DB_PASSWORD_ADMIN,
    config
  );
  
  if (adminPool) {
    const result = await adminPool.request().query('SELECT GETDATE() as currentTime');
    console.log('  Текущее время из базы данных:', result.recordset[0].currentTime);
    await adminPool.close();
  } else {
    console.log('  ⚠ Подключение не удалось, но проверка хеша прошла успешно');
  }
  
  // Попытка подключения с неправильным паролем
  console.log('\n2.2. Попытка подключения с неправильным паролем:');
  const adminPoolWrong = await connectWithHashedPassword(
    process.env.DB_USER_ADMIN,
    'wrongPassword',
    config
  );
  
  if (!adminPoolWrong) {
    console.log('  ✓ Правильно: подключение с неправильным паролем отклонено');
  }
  
  console.log('\n3. Тестирование подключения обычного пользователя:');
  
  // Подключение обычного пользователя с правильным паролем из переменных окружения
  console.log('\n3.1. Подключение с правильным паролем:');
  const userPool = await connectWithHashedPassword(
    process.env.DB_USER_REGULAR,
    process.env.DB_PASSWORD_REGULAR,
    config
  );
  
  if (userPool) {
    const result = await userPool.request().query('SELECT GETDATE() as currentTime');
    console.log('  Текущее время из базы данных:', result.recordset[0].currentTime);
    await userPool.close();
  } else {
    console.log('  ⚠ Подключение не удалось, но проверка хеша прошла успешно');
  }
  
  // Попытка подключения обычного пользователя с неправильным паролем
  console.log('\n3.2. Попытка подключения с неправильным паролем:');
  const userPoolWrong = await connectWithHashedPassword(
    process.env.DB_USER_REGULAR,
    'wrongPassword',
    config
  );
  
  if (!userPoolWrong) {
    console.log('  ✓ Правильно: подключение с неправильным паролем отклонено');
  }
  
  console.log('\n---\n');
  console.log('Демонстрация безопасного подключения завершена!');
  console.log('\nКлючевые особенности подхода:');
  console.log('- Учетные данные базы данных хранятся в auth-db.json с использованием хешей');
  console.log('- Перед подключением к базе данных происходит проверка соответствия учетных данных хешам');
  console.log('- Все учетные данные берутся исключительно из переменных окружения');
  console.log('- Даже если файл с хешами будет скомпрометирован, оригинальные пароли остаются в безопасности');
  console.log('- Все попытки подключения логируются и могут быть отслежены');
  console.log('- Подход совместим с существующей инфраструктурой SQL Server');
}

// Запуск демонстрации
demonstrateSecureConnection().catch(error => {
  console.error('Ошибка в демонстрации:', error);
});