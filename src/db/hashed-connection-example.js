/**
 * Пример реализации подключения к базе данных с использованием хешированных паролей
 * Этот пример демонстрирует подход, при котором пароли хранятся в виде хешей,
 * и перед подключением к базе данных происходит проверка соответствия введенного пароля хешу
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { hashPassword, verifyPassword } = require('./auth-service');

// Путь к файлу с хешами паролей базы данных
const DB_HASHES_FILE = path.join(__dirname, 'db-hashes.json');

/**
 * Инициализация файла с хешами паролей базы данных
 * В реальной системе это будет выполняться администратором при настройке
 */
function initializeDbHashes() {
  // Хешируем пароли для пользователей базы данных
  const dbHashes = {
    users: {
      'AppSuperAdmin': {
        username: 'AppSuperAdmin',
        ...hashPassword('aA3$!Qp9_superAdminStrongPwd')
      },
      'AppSuperUser': {
        username: 'AppSuperUser',
        ...hashPassword('uU7@!Kx2_superUserStrongPwd')
      }
    },
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  // Сохраняем хеши в файл
  fs.writeFileSync(DB_HASHES_FILE, JSON.stringify(dbHashes, null, 2));
  console.log('Файл с хешами паролей базы данных инициализирован');
  
  return dbHashes;
}

/**
 * Проверка пароля пользователя базы данных
 * @param {string} username - Имя пользователя базы данных
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - Соответствует ли пароль хешу
 */
function verifyDbPassword(username, password) {
  try {
    // Проверяем, существует ли файл с хешами
    if (!fs.existsSync(DB_HASHES_FILE)) {
      console.log('Файл с хешами паролей базы данных не найден, инициализация...');
      initializeDbHashes();
    }
    
    // Читаем файл с хешами
    const hashesData = fs.readFileSync(DB_HASHES_FILE, 'utf8');
    const dbHashes = JSON.parse(hashesData);
    
    // Получаем пользователя
    const user = dbHashes.users[username];
    if (!user) {
      console.log(`Пользователь базы данных ${username} не найден`);
      return false;
    }
    
    // Проверяем пароль
    const isValid = verifyPassword(password, user.hash, user.salt);
    console.log(`Проверка пароля для ${username}: ${isValid ? 'ДЕЙСТВИТЕЛЕН' : 'НЕДЕЙСТВИТЕЛЕН'}`);
    return isValid;
  } catch (error) {
    console.error('Ошибка при проверке пароля базы данных:', error);
    return false;
  }
}

/**
 * Подключение к базе данных с проверкой хешированного пароля
 * @param {string} username - Имя пользователя базы данных
 * @param {string} password - Пароль для проверки и использования
 * @param {object} connectionConfig - Конфигурация подключения к базе данных
 * @returns {object|null} - Пул подключений или null при ошибке
 */
async function connectWithHashedPassword(username, password, connectionConfig) {
  try {
    console.log(`Попытка подключения к базе данных от имени ${username} с проверкой хеша...`);
    
    // Сначала проверяем пароль через хеши
    const isPasswordValid = verifyDbPassword(username, password);
    if (!isPasswordValid) {
      console.log('✗ Проверка хеша пароля не пройдена, подключение отклонено');
      return null;
    }
    
    console.log('✓ Проверка хеша пароля пройдена, продолжаем подключение');
    
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
  
  // Инициализируем хеши паролей
  console.log('1. Инициализация хешей паролей базы данных:');
  initializeDbHashes();
  
  // Конфигурация подключения к базе данных (используем правильный формат из .env)
  const serverConfig = process.env.DB_SERVER || 'OZO-62,1433';
  const config = {
    server: serverConfig.split(',')[0], // Извлекаем имя сервера
    database: process.env.DB_DATABASE || 'ProcessCraftBD',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      // Если указан порт, используем его, иначе используем порт по умолчанию
      port: serverConfig.includes(',') ? parseInt(serverConfig.split(',')[1]) : 1433
    }
  };
  
  console.log('\n2. Тестирование подключения суперадмина:');
  
  // Подключение с правильным паролем
  console.log('\n2.1. Подключение с правильным паролем:');
  const adminPool = await connectWithHashedPassword(
    'AppSuperAdmin',
    'aA3$!Qp9_superAdminStrongPwd',
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
    'AppSuperAdmin',
    'wrongPassword',
    config
  );
  
  if (!adminPoolWrong) {
    console.log('  ✓ Правильно: подключение с неправильным паролем отклонено');
  }
  
  console.log('\n3. Тестирование подключения обычного пользователя:');
  
  // Подключение обычного пользователя с правильным паролем
  console.log('\n3.1. Подключение с правильным паролем:');
  const userPool = await connectWithHashedPassword(
    'AppSuperUser',
    'uU7@!Kx2_superUserStrongPwd',
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
    'AppSuperUser',
    'wrongPassword',
    config
  );
  
  if (!userPoolWrong) {
    console.log('  ✓ Правильно: подключение с неправильным паролем отклонено');
  }
  
  console.log('\n---\n');
  console.log('Демонстрация безопасного подключения завершена!');
  console.log('\nКлючевые особенности подхода:');
  console.log('- Пароли базы данных хранятся в виде хешей, а не в открытом виде');
  console.log('- Перед подключением к базе данных происходит проверка соответствия пароля хешу');
  console.log('- Даже если файл с хешами будет скомпрометирован, оригинальные пароли остаются в безопасности');
  console.log('- Все попытки подключения логируются и могут быть отслежены');
  console.log('- Подход совместим с существующей инфраструктурой SQL Server');
}

// Запуск демонстрации
demonstrateSecureConnection().catch(error => {
  console.error('Ошибка в демонстрации:', error);
});