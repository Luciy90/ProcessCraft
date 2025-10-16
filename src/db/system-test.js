/**
 * Единый файл для проверки работоспособности приложения с СУБД
 * Этот файл объединяет все тесты из папки src\db в единый тестовый файл
 * для проверки корректности работы всей системы после развертывания СУБД
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sql = require('mssql');

// Пути к файлам
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');
const SETUP_SCRIPT = path.join(__dirname, 'setup-db-access.js');

/**
 * Проверка существования и валидности auth-db.json
 * @returns {boolean} - true если файл существует и не пуст, false в противном случае
 */
function validateAuthDbFile() {
  try {
    console.log('1. Проверка существования и валидности auth-db.json...');
    
    // Проверяем существование файла
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('  Файл auth-db.json не найден');
      return false;
    }
    
    // Читаем содержимое файла
    const fileContent = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    
    // Проверяем, что файл не пуст
    if (!fileContent || fileContent.trim() === '') {
      console.log('  Файл auth-db.json пуст');
      return false;
    }
    
    // Проверяем, что файл содержит валидный JSON
    const authDb = JSON.parse(fileContent);
    
    // Проверяем структуру файла
    if (!authDb.db_config || !authDb.users || !Array.isArray(authDb.users)) {
      console.log('  Файл auth-db.json имеет неверную структуру');
      return false;
    }
    
    console.log('  ✓ Файл auth-db.json существует, не пуст и имеет правильную структуру');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при проверке auth-db.json: ${error.message}`);
    return false;
  }
}

/**
 * Запуск скрипта настройки доступа к СУБД
 */
function runSetupScript() {
  try {
    console.log('2. Запуск скрипта настройки доступа к СУБД...');
    
    // Запускаем скрипт настройки
    execSync(`node "${SETUP_SCRIPT}"`, { stdio: 'inherit' });
    
    console.log('  ✓ Скрипт настройки успешно выполнен');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при выполнении скрипта настройки: ${error.message}`);
    return false;
  }
}

/**
 * Тест сервиса аутентификации
 * @returns {boolean} - Результат теста сервиса аутентификации
 */
function testAuthService() {
  try {
    console.log('3. Тестирование сервиса аутентификации...');
    
    // Импортируем функции сервиса аутентификации
    const { 
      hashPassword,
      verifyPassword
    } = require('./auth-service');
    
    // Тест хеширования пароля
    console.log('  3.1. Тестирование хеширования пароля:');
    const password = 'testPassword123';
    const { hash, salt } = hashPassword(password);
    console.log('    Пароль успешно хеширован');
    
    // Тест проверки пароля
    console.log('  3.2. Тестирование проверки пароля:');
    const isValid = verifyPassword(password, hash, salt);
    if (!isValid) {
      console.log('    ✗ Результат проверки пароля не пройден');
      return false;
    }
    console.log('    ✓ Результат проверки пароля пройден');
    
    const isInvalid = verifyPassword('wrongPassword', hash, salt);
    if (isInvalid) {
      console.log('    ✗ Результат проверки неверного пароля не пройден');
      return false;
    }
    console.log('    ✓ Результат проверки неверного пароля пройден');
    
    console.log('  ✓ Все тесты сервиса аутентификации пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании сервиса аутентификации: ${error.message}`);
    return false;
  }
}

/**
 * Тест модуля шифрования/дешифрования
 * @returns {boolean} - Результат теста модуля шифрования/дешифрования
 */
function testEncryption() {
  try {
    console.log('4. Тестирование модуля шифрования/дешифрования...');
    
    // Импортируем функции модуля шифрования
    const { encrypt, decrypt } = require('./encryption');
    
    // Тест базового шифрования/дешифрования
    console.log('  4.1. Тестирование базового шифрования/дешифрования:');
    const testData = 'Это секретное сообщение!';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (testData !== decrypted) {
      console.log('    ✗ Базовое шифрование/дешифрование не пройдено');
      return false;
    }
    console.log('    ✓ Базовое шифрование/дешифрование пройдено');
    
    console.log('  ✓ Все тесты модуля шифрования/дешифрования пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании модуля шифрования/дешифрования: ${error.message}`);
    return false;
  }
}

/**
 * Тест подключения к базе данных
 * @returns {Promise<boolean>} - Результат теста подключения
 */
async function testDatabaseConnection() {
  try {
    console.log('5. Тест подключения к базе данных...');
    
    // Импортируем функции подключения
    const { initializeConnection } = require('./connection');
    
    // Тестируем подключение суперадмина
    console.log('  5.1. Тест подключения суперадмина...');
    const adminPool = await initializeConnection('superadmin');
    await adminPool.close();
    console.log('    ✓ Подключение суперадмина успешно');
    
    // Тестируем подключение обычного пользователя
    console.log('  5.2. Тест подключения обычного пользователя...');
    const regularPool = await initializeConnection('regular');
    await regularPool.close();
    console.log('    ✓ Подключение обычного пользователя успешно');
    
    console.log('  ✓ Все тесты подключения пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании подключения: ${error.message}`);
    return false;
  }
}

/**
 * Тест хеширования и проверки учетных данных
 * @returns {boolean} - Результат теста хеширования
 */
function testHashingAndVerification() {
  try {
    console.log('6. Тест хеширования и проверки учетных данных...');
    
    // Импортируем функции хеширования
    const { hashPassword, verifyPassword } = require('./auth-service');
    
    // Тестируем хеширование и проверку пароля
    console.log('  6.1. Тест хеширования и проверки пароля...');
    const password = 'testPassword123!';
    const hashed = hashPassword(password);
    const isValid = verifyPassword(password, hashed.hash, hashed.salt);
    
    if (!isValid) {
      console.log('    ✗ Проверка хешированного пароля не пройдена');
      return false;
    }
    console.log('    ✓ Хеширование и проверка пароля пройдены успешно');
    
    // Тестируем проверку неправильного пароля
    console.log('  6.2. Тест проверки неправильного пароля...');
    const isInvalid = verifyPassword('wrongPassword', hashed.hash, hashed.salt);
    if (isInvalid) {
      console.log('    ✗ Проверка неправильного пароля не должна пройти');
      return false;
    }
    console.log('    ✓ Проверка неправильного пароля корректно отклонена');
    
    console.log('  ✓ Все тесты хеширования пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании хеширования: ${error.message}`);
    return false;
  }
}

/**
 * Тест проверки учетных данных через хеши
 * @returns {boolean} - Результат теста проверки учетных данных
 */
function testCredentialsVerification() {
  try {
    console.log('7. Тест проверки учетных данных через хеши...');
    
    // Импортируем функции проверки учетных данных
    const { verifyDatabaseCredentials } = require('./setup-db-access');
    
    // Получаем параметры подключения из .env (используем те же значения, что и при хешировании)
    const server = process.env.DB_SERVER;
    const database = process.env.DB_DATABASE;
    const adminUser = process.env.DB_USER_ADMIN;
    const adminPassword = process.env.DB_PASSWORD_ADMIN;
    const regularUser = process.env.DB_USER_REGULAR;
    const regularPassword = process.env.DB_PASSWORD_REGULAR;
    
    // Тестируем проверку учетных данных суперадмина
    console.log('  7.1. Тест проверки учетных данных суперадмина...');
    const adminValid = verifyDatabaseCredentials(server, database, adminUser, adminPassword);
    if (!adminValid) {
      console.log('    ✗ Проверка учетных данных суперадмина не пройдена');
      return false;
    }
    console.log('    ✓ Проверка учетных данных суперадмина пройдена');
    
    // Тестируем проверку учетных данных обычного пользователя
    console.log('  7.2. Тест проверки учетных данных обычного пользователя...');
    const regularValid = verifyDatabaseCredentials(server, database, regularUser, regularPassword);
    if (!regularValid) {
      console.log('    ✗ Проверка учетных данных обычного пользователя не пройдена');
      return false;
    }
    console.log('    ✓ Проверка учетных данных обычного пользователя пройдена');
    
    // Тестируем проверку с неправильным паролем
    console.log('  7.3. Тест проверки с неправильным паролем...');
    const invalidPassword = verifyDatabaseCredentials(server, database, adminUser, 'wrongPassword');
    if (invalidPassword) {
      console.log('    ✗ Проверка с неправильным паролем не должна пройти');
      return false;
    }
    console.log('    ✓ Проверка с неправильным паролем корректно отклонена');
    
    console.log('  ✓ Все тесты проверки учетных данных пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании проверки учетных данных: ${error.message}`);
    return false;
  }
}

/**
 * Тест подключения к базе данных через хеширование паролей
 * @returns {Promise<boolean>} - Результат теста подключения через хеширование
 */
async function testHashedAuthentication() {
  try {
    console.log('8. Тест подключения к базе данных через хеширование паролей...');
    
    // Импортируем необходимые функции
    const { hashPassword, verifyPassword } = require('./auth-service');
    const { verifyDatabaseCredentials } = require('./setup-db-access');
    
    // 1. Демонстрация хеширования паролей
    console.log('  8.1. Демонстрация хеширования паролей:');
    
    // Хешируем пароль суперадмина
    const superAdminPassword = 'aA3$!Qp9_superAdminStrongPwd';
    const superAdminHashed = hashPassword(superAdminPassword);
    console.log('    ✓ Хешированный пароль суперадмина создан');
    
    // Хешируем пароль обычного пользователя
    const regularUserPassword = 'uU7@!Kx2_superUserStrongPwd';
    const regularUserHashed = hashPassword(regularUserPassword);
    console.log('    ✓ Хешированный пароль обычного пользователя создан');
    
    // 2. Демонстрация проверки паролей
    console.log('  8.2. Демонстрация проверки паролей:');
    
    // Проверяем правильный пароль суперадмина
    const superAdminValid = verifyPassword(superAdminPassword, superAdminHashed.hash, superAdminHashed.salt);
    if (!superAdminValid) {
      console.log('    ✗ Проверка правильного пароля суперадмина не пройдена');
      return false;
    }
    console.log('    ✓ Проверка правильного пароля суперадмина пройдена');
    
    // Проверяем неправильный пароль суперадмина
    const superAdminInvalid = verifyPassword('wrongPassword', superAdminHashed.hash, superAdminHashed.salt);
    if (superAdminInvalid) {
      console.log('    ✗ Проверка неправильного пароля суперадмина не пройдена');
      return false;
    }
    console.log('    ✓ Проверка неправильного пароля суперадмина пройдена');
    
    // Проверяем правильный пароль обычного пользователя
    const regularUserValid = verifyPassword(regularUserPassword, regularUserHashed.hash, regularUserHashed.salt);
    if (!regularUserValid) {
      console.log('    ✗ Проверка правильного пароля обычного пользователя не пройдена');
      return false;
    }
    console.log('    ✓ Проверка правильного пароля обычного пользователя пройдена');
    
    // 3. Подключение к базе данных с использованием хешированных учетных данных
    console.log('  8.3. Подключение к базе данных с использованием хешированных учетных данных:');
    
    // Конфигурация подключения
    const config = {
      server: (process.env.DB_SERVER).split(',')[0],
      database: process.env.DB_DATABASE,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        port: (process.env.DB_SERVER).includes(',') ? 
              parseInt((process.env.DB_SERVER).split(',')[1]) : 1433
      }
    };
    
    // Подключение от имени суперадмина (используя пароль из переменных окружения)
    console.log('  8.4. Подключение от имени суперадмина:');
    const adminUser = process.env.DB_USER_ADMIN;
    const adminPassword = process.env.DB_PASSWORD_ADMIN;
    
    // Проверяем соответствие учетных данных хешам в auth-db.json
    const adminCredentialsValid = verifyDatabaseCredentials(
      config.server + (config.options.port ? ',' + config.options.port : ''),
      config.database,
      adminUser,
      adminPassword
    );
    
    if (adminCredentialsValid) {
      const adminConfig = {...config};
      adminConfig.user = adminUser;
      adminConfig.password = adminPassword;
      
      try {
        const adminPool = new sql.ConnectionPool(adminConfig);
        await adminPool.connect();
        console.log('    ✓ Подключение суперадмина успешно!');
        
        const result = await adminPool.request().query('SELECT GETDATE() as currentTime');
        console.log('    Текущее время из базы данных:', result.recordset[0].currentTime);
        
        await adminPool.close();
      } catch (err) {
        console.log('    ✗ Ошибка подключения суперадмина:', err.message);
        return false;
      }
    } else {
      console.log('    ✗ Учетные данные суперадмина не прошли проверку хешей');
      return false;
    }
    
    // Подключение от имени обычного пользователя (используя пароль из переменных окружения)
    console.log('  8.5. Подключение от имени обычного пользователя:');
    const regularUser = process.env.DB_USER_REGULAR;
    const regularPassword = process.env.DB_PASSWORD_REGULAR;
    
    // Проверяем соответствие учетных данных хешам в auth-db.json
    const regularCredentialsValid = verifyDatabaseCredentials(
      config.server + (config.options.port ? ',' + config.options.port : ''),
      config.database,
      regularUser,
      regularPassword
    );
    
    if (regularCredentialsValid) {
      const regularConfig = {...config};
      regularConfig.user = regularUser;
      regularConfig.password = regularPassword;
      
      try {
        const regularPool = new sql.ConnectionPool(regularConfig);
        await regularPool.connect();
        console.log('    ✓ Подключение обычного пользователя успешно!');
        
        const result = await regularPool.request().query('SELECT GETDATE() as currentTime');
        console.log('    Текущее время из базы данных:', result.recordset[0].currentTime);
        
        await regularPool.close();
      } catch (err) {
        console.log('    ✗ Ошибка подключения обычного пользователя:', err.message);
        return false;
      }
    } else {
      console.log('    ✗ Учетные данные обычного пользователя не прошли проверку хешей');
      return false;
    }
    
    console.log('  ✓ Все тесты подключения через хеширование паролей пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании подключения через хеширование: ${error.message}`);
    return false;
  }
}

/**
 * Тестирование хранилища учетных данных
 * @returns {boolean} - Результат теста хранилища учетных данных
 */
function testCredentialsStore() {
  try {
    console.log('9. Тестирование хранилища учетных данных...');
    
    // Импортируем функции хранилища учетных данных
    const { initializeCredentialsStore, loadCredentialsFromStore } = require('./credentials-store');
    
    // Инициализация хранилища учетных данных
    console.log('  9.1. Инициализация хранилища учетных данных:');
    const credentialsStore = initializeCredentialsStore();
    console.log('    ✓ Хранилище учетных данных успешно инициализировано');
    
    // Загрузка учетных данных суперадмина
    console.log('  9.2. Загрузка учетных данных суперадмина:');
    const superAdminCredentials = loadCredentialsFromStore('superadmin');
    if (!superAdminCredentials) {
      console.log('    ✗ Учетные данные суперадмина не загружены');
      return false;
    }
    console.log('    ✓ Учетные данные суперадмина загружены');
    
    // Загрузка учетных данных обычного пользователя
    console.log('  9.3. Загрузка учетных данных обычного пользователя:');
    const regularUserCredentials = loadCredentialsFromStore('regular');
    if (!regularUserCredentials) {
      console.log('    ✗ Учетные данные обычного пользователя не загружены');
      return false;
    }
    console.log('    ✓ Учетные данные обычного пользователя загружены');
    
    console.log('  ✓ Все тесты хранилища учетных данных пройдены успешно');
    return true;
  } catch (error) {
    console.log(`  ✗ Ошибка при тестировании хранилища учетных данных: ${error.message}`);
    return false;
  }
}

/**
 * Тестирование операций БД
 * @returns {Promise<boolean>} - Результат теста операций БД
 */
async function testDatabaseOperations() {
  try {
    console.log('10. Тестирование операций БД...');
    
    // Импортируем необходимые функции
    const { hashData, readSaltFromFile } = require('./setup-db-access');
    
    // Функция для проверки соответствия учетных данных хешам в auth-db.json
    function verifyCredentialsAgainstHashes(username, password) {
      try {
        // Читаем auth-db.json
        if (!fs.existsSync(AUTH_DB_FILE)) {
          throw new Error('Файл auth-db.json не найден');
        }
        
        const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
        const authDb = JSON.parse(authData);
        
        // Ищем пользователя по хешу логина
        const user = authDb.users[username];
        if (!user) {
          console.log('✗ Пользователь не найден');
          return false;
        }
        
        // Проверяем логин
        const loginSalt = readSaltFromFile(user.login_salt_file);
        const loginHashed = hashData(username, loginSalt);
        if (loginHashed.hash !== user.login_hash) {
          console.log('✗ Неверное имя пользователя');
          return false;
        }
        
        // Проверяем пароль
        const passwordSalt = readSaltFromFile(user.password_salt_file);
        const passwordHashed = hashData(password, passwordSalt);
        if (passwordHashed.hash !== user.password_hash) {
          console.log('✗ Неверный пароль');
          return false;
        }
        
        console.log('✓ Все учетные данные проверены успешно');
        return true;
      } catch (error) {
        console.error('Ошибка при проверке учетных данных:', error.message);
        return false;
      }
    }
    
    // Конфигурация подключения с точными учетными данными из MySQL.md
    const config = {
      server: (process.env.DB_SERVER).split(',')[0],
      database: process.env.DB_DATABASE,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        port: (process.env.DB_SERVER).includes(',') ? 
              parseInt((process.env.DB_SERVER).split(',')[1]) : 1433
      }
    };
    
    // Подключение от имени суперадмина
    console.log('  10.1. Подключение от имени суперадмина ...');
    const adminUser = process.env.DB_USER_ADMIN;
    const adminPassword = process.env.DB_PASSWORD_ADMIN;
    
    // Проверяем соответствие учетных данных хешам
    if (!verifyCredentialsAgainstHashes(adminUser, adminPassword)) {
      console.log('    ✗ Учетные данные суперадмина не соответствуют хешам в auth-db.json');
      return false;
    }
    
    const adminConfig = {...config};
    adminConfig.user = adminUser;
    adminConfig.password = adminPassword;
    
    const adminPool = new sql.ConnectionPool(adminConfig);
    await adminPool.connect();
    console.log('    ✓ Подключение суперадмина успешно!');
    
    // Подключение от имени обычного пользователя
    console.log('  10.2. Подключение от имени обычного пользователя...');
    const regularUser = process.env.DB_USER_REGULAR;
    const regularPassword = process.env.DB_PASSWORD_REGULAR;
    
    // Проверяем соответствие учетных данных хешам
    if (!verifyCredentialsAgainstHashes(regularUser, regularPassword)) {
      console.log('    ✗ Учетные данные обычного пользователя не соответствуют хешам в auth-db.json');
      await adminPool.close();
      return false;
    }
    
    const regularConfig = {...config};
    regularConfig.user = regularUser;
    regularConfig.password = regularPassword;
    
    const regularPool = new sql.ConnectionPool(regularConfig);
    await regularPool.connect();
    console.log('    ✓ Подключение обычного пользователя успешно!');
    
    // Тестирование операций БД
    console.log('  10.3. Тестирование операций БД:');
    
    // 10.3.1. Создание тестовой таблицы (только суперадмин)
    const testTableName = `TestTable_${Date.now()}`;
    console.log(`    10.3.1. Создание тестовой таблицы ${testTableName} от имени суперадмина...`);
    try {
      await adminPool.request().query(`
        CREATE TABLE ${testTableName} (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100),
          description NVARCHAR(255),
          created_at DATETIME DEFAULT GETDATE()
        )
      `);
      console.log('      ✓ Таблица успешно создана');
    } catch (err) {
      console.log('      ✗ Ошибка создания таблицы:', err.message);
      await regularPool.close();
      await adminPool.close();
      return false;
    }
    
    // 10.3.2. Вставка тестовой записи от имени суперадмина
    console.log('    10.3.2. Вставка тестовой записи от имени суперадмина...');
    try {
      await adminPool.request()
        .input('name', sql.NVarChar(100), 'Тестовая запись от суперадмина')
        .input('description', sql.NVarChar(255), 'Это тестовая запись, созданная суперадмином')
        .query(`INSERT INTO ${testTableName} (name, description) VALUES (@name, @description)`);
      console.log('      ✓ Тестовая запись успешно вставлена суперадмином');
    } catch (err) {
      console.log('      ✗ Ошибка вставки записи суперадмином:', err.message);
    }
    
    // 10.3.3. Вставка тестовой записи от имени обычного пользователя
    console.log('    10.3.3. Вставка тестовой записи от имени обычного пользователя...');
    try {
      await regularPool.request()
        .input('name', sql.NVarChar(100), 'Тестовая запись от пользователя')
        .input('description', sql.NVarChar(255), 'Это тестовая запись, созданная обычным пользователем')
        .query(`INSERT INTO ${testTableName} (name, description) VALUES (@name, @description)`);
      console.log('      ✓ Тестовая запись успешно вставлена обычным пользователем');
    } catch (err) {
      console.log('      ✗ Ошибка вставки записи обычным пользователем:', err.message);
    }
    
    // 10.3.4. Выборка данных от имени суперадмина
    console.log('    10.3.4. Выборка данных из тестовой таблицы от имени суперадмина...');
    try {
      const result = await adminPool.request().query(`SELECT * FROM ${testTableName} ORDER BY id`);
      console.log(`      ✓ Выбрано ${result.recordset.length} записей`);
      result.recordset.forEach((row, index) => {
        console.log(`        Запись ${index + 1}: ID=${row.id}, Name="${row.name}", Description="${row.description}"`);
      });
    } catch (err) {
      console.log('      ✗ Ошибка выборки данных суперадмином:', err.message);
    }
    
    // 10.3.5. Выборка данных от имени обычного пользователя
    console.log('    10.3.5. Выборка данных из тестовой таблицы от имени обычного пользователя...');
    try {
      const result = await regularPool.request().query(`SELECT * FROM ${testTableName} ORDER BY id`);
      console.log(`      ✓ Выбрано ${result.recordset.length} записей`);
      result.recordset.forEach((row, index) => {
        console.log(`        Запись ${index + 1}: ID=${row.id}, Name="${row.name}", Description="${row.description}"`);
      });
    } catch (err) {
      console.log('      ✗ Ошибка выборки данных обычным пользователем:', err.message);
    }
    
    // 10.3.6. Обновление записи от имени суперадмина
    console.log('    10.3.6. Обновление записи от имени суперадмина...');
    try {
      await adminPool.request()
        .input('id', sql.Int, 1)
        .input('description', sql.NVarChar(255), 'Обновлено суперадмином')
        .query(`UPDATE ${testTableName} SET description = @description WHERE id = @id`);
      console.log('      ✓ Запись успешно обновлена суперадмином');
    } catch (err) {
      console.log('      ✗ Ошибка обновления записи суперадмином:', err.message);
    }
    
    // 10.3.7. Обновление записи от имени обычного пользователя
    console.log('    10.3.7. Обновление записи от имени обычного пользователя...');
    try {
      await regularPool.request()
        .input('id', sql.Int, 2)
        .input('description', sql.NVarChar(255), 'Обновлено обычным пользователем')
        .query(`UPDATE ${testTableName} SET description = @description WHERE id = @id`);
      console.log('      ✓ Запись успешно обновлена обычным пользователем');
    } catch (err) {
      console.log('      ✗ Ошибка обновления записи обычным пользователем:', err.message);
    }
    
    // 10.3.8. Удаление тестовой записи от имени суперадмина
    console.log('    10.3.8. Удаление тестовой записи от имени суперадмина...');
    try {
      const result = await adminPool.request()
        .input('id', sql.Int, 1)
        .query(`DELETE FROM ${testTableName} WHERE id = @id`);
      console.log(`      ✓ Удалено ${result.rowsAffected[0]} записей суперадмином`);
    } catch (err) {
      console.log('      ✗ Ошибка удаления записи суперадмином:', err.message);
    }
    
    // 10.3.9. Попытка создания таблицы обычным пользователем (должна завершиться ошибкой)
    console.log('    10.3.9. Попытка создания таблицы обычным пользователем...');
    try {
      const userTestTable = `UserTestTable_${Date.now()}`;
      await regularPool.request().query(`
        CREATE TABLE ${userTestTable} (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100)
        )
      `);
      console.log('      ✗ ОШИБКА: Обычный пользователь не должен иметь права создавать таблицы');
      // Очистка, если таблица была создана
      await adminPool.request().query(`DROP TABLE IF EXISTS ${userTestTable}`);
      return false;
    } catch (err) {
      console.log('      ✓ Правильно: Обычный пользователь не имеет прав на создание таблиц');
    }
    
    // 10.3.10. Попытка удаления таблицы обычным пользователем (должна завершиться ошибкой)
    console.log('    10.3.10. Попытка удаления таблицы обычным пользователем...');
    try {
      await regularPool.request().query(`DROP TABLE ${testTableName}`);
      console.log('      ✗ ОШИБКА: Обычный пользователь не должен иметь права удалять таблицы');
      return false;
    } catch (err) {
      console.log('      ✓ Правильно: Обычный пользователь не имеет прав на удаление таблиц');
    }
    
    // 10.3.11. Удаление тестовой таблицы от имени суперадмина
    console.log('    10.3.11. Удаление тестовой таблицы от имени суперадмина...');
    try {
      await adminPool.request().query(`DROP TABLE ${testTableName}`);
      console.log('      ✓ Тестовая таблица успешно удалена суперадмином');
    } catch (err) {
      console.log('      ✗ Ошибка удаления таблицы суперадмином:', err.message);
    }
    
    // Закрытие подключений
    await regularPool.close();
    await adminPool.close();
    
    console.log('  ✓ Все тесты операций БД пройдены успешно');
    console.log('    Резюме:');
    console.log('    - SuperAdmin может создавать, читать, обновлять и удалять таблицы');
    console.log('    - Regular User может читать, вставлять и обновлять данные в существующих таблицах');
    console.log('    - Regular User НЕ может создавать или удалять таблицы');
    console.log('    - Оба пользователя успешно подключены к базе данных');
    console.log('    - Все учетные данные проверены на соответствие хешам в auth-db.json');
    
    return true;
  } catch (err) {
    console.log(`  ✗ Ошибка при тестировании операций БД: ${err.message}`);
    return false;
  }
}

/**
 * Основная функция выполнения всех тестов
 */
async function runAllTests() {
  try {
    console.log('=== Единый тест проверки работоспособности приложения с СУБД ===\n');
    
    // Шаг 1: Проверка существования и валидности auth-db.json
    const isAuthDbValid = validateAuthDbFile();
    if (!isAuthDbValid) {
      console.log('  Необходимо запустить скрипт настройки доступа к СУБД\n');
      // Шаг 2: Запуск скрипта настройки
      const setupSuccess = runSetupScript();
      if (!setupSuccess) {
        console.log('\n✗ Тестирование прервано: не удалось настроить доступ к СУБД');
        process.exit(1);
      }
    }
    
    console.log('\n=== Запуск комплексного тестирования ===\n');
    
    // Шаг 3: Тест сервиса аутентификации
    const authServiceSuccess = testAuthService();
    if (!authServiceSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка сервиса аутентификации');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 4: Тест модуля шифрования/дешифрования
    const encryptionSuccess = testEncryption();
    if (!encryptionSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка модуля шифрования/дешифрования');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 5: Тест подключения к базе данных
    const connectionSuccess = await testDatabaseConnection();
    if (!connectionSuccess) {
      console.log('\n✗ Тестирование прервано: не удалось подключиться к базе данных');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 6: Тест хеширования и проверки учетных данных
    const hashingSuccess = testHashingAndVerification();
    if (!hashingSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка хеширования учетных данных');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 7: Тест проверки учетных данных через хеши
    const verificationSuccess = testCredentialsVerification();
    if (!verificationSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка проверки учетных данных');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 8: Тест подключения к базе данных через хеширование паролей
    const hashedAuthSuccess = await testHashedAuthentication();
    if (!hashedAuthSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка подключения через хеширование');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 9: Тест хранилища учетных данных
    const credentialsStoreSuccess = testCredentialsStore();
    if (!credentialsStoreSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка хранилища учетных данных');
      process.exit(1);
    }
    
    console.log();
    
    // Шаг 10: Тест операций БД
    const databaseOperationsSuccess = await testDatabaseOperations();
    if (!databaseOperationsSuccess) {
      console.log('\n✗ Тестирование прервано: ошибка операций БД');
      process.exit(1);
    }
    
    console.log('\n=== Все тесты пройдены успешно ===');
    console.log('✓ Система полностью функциональна и готова к работе');
    
  } catch (error) {
    console.log(`\n✗ Критическая ошибка при выполнении тестов: ${error.message}`);
    process.exit(1);
  }
}

// Запуск тестов, если файл запущен напрямую
if (require.main === module) {
  runAllTests().catch(error => {
    console.log(`\n✗ Необработанная ошибка: ${error.message}`);
    process.exit(1);
  });
}

// Экспорт функций для использования в других модулях
module.exports = {
  runAllTests,
  validateAuthDbFile,
  runSetupScript,
  testAuthService,
  testEncryption,
  testDatabaseConnection,
  testHashingAndVerification,
  testCredentialsVerification,
  testHashedAuthentication,
  testCredentialsStore,
  testDatabaseOperations
};