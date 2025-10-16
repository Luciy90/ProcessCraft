/**
 * Функция настройки доступа к СУБД с хешированием учетных данных
 * Эта функция запускается после развертывания СУБД для настройки подключения приложения
 */
const path = require('path');
// Указываем путь к .env файлу явно
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const crypto = require('crypto');

// Пути к файлам
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');
const ENV_FILE = path.join(__dirname, '../../.env');
// Используем абсолютный путь для директории солей, но без дублирования
const SALT_DIR = path.resolve(__dirname, 'src/salt');

/**
 * Гарантирует наличие файла auth-db.json (создаёт, если отсутствует или пустой)
 */
function ensureAuthDbFile() {
  try {
    const exists = fs.existsSync(AUTH_DB_FILE);
    const isEmpty = exists ? fs.statSync(AUTH_DB_FILE).size === 0 : true;
    if (!exists || isEmpty) {
      const placeholder = {
        initializing: true,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(placeholder, null, 2));
      console.log('✓ Создан базовый файл auth-db.json');
    }
  } catch (e) {
    console.warn('Не удалось проверить/создать auth-db.json заранее:', e.message);
  }
}

/**
 * Хеширование данных с использованием PBKDF2
 * @param {string} data - Данные для хеширования
 * @param {string} salt - Соль для использования (необязательно, будет сгенерирована, если не указана)
 * @returns {Object} - Объект, содержащий хеш и соль
 */
function hashData(data, salt = null) {
  // Генерируем соль, если она не предоставлена
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
  }
  
  // Хешируем данные с использованием PBKDF2
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash,
    salt
  };
}

/**
 * Создание файла соль для данных
 * @param {number} index - Порядковый номер файла
 * @param {string} salt - Соль для сохранения
 * @returns {string} - Имя созданного файла
 */
function createSaltFile(index, salt) {
  // Убедимся, что директория для солей существует
  const saltDir = path.resolve(SALT_DIR);
  if (!fs.existsSync(saltDir)) {
    fs.mkdirSync(saltDir, { recursive: true });
  }
  
  const saltFileName = `salt${index}.json`;
  const saltFilePath = path.join(saltDir, saltFileName);
  
  const saltData = {
    salt: salt,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(saltFilePath, JSON.stringify(saltData, null, 2));
  console.log(`  ✓ Создан файл соли: ${saltFileName} в ${saltDir}`);
  
  return saltFileName;
}

/**
 * Проверка существования и валидация .env файла
 * @returns {Object} Объект с данными из .env
 */
function validateAndReadEnvFile() {
  console.log('Проверка и чтение .env файла...');
  
  try {
    // Проверяем существование файла
    if (!fs.existsSync(ENV_FILE)) {
      throw new Error('Не найден файл .env');
    }
    
    // Проверяем обязательные переменные
    const requiredVars = [
      'DB_SERVER', 'DB_DATABASE', 
      'DB_USER_REGULAR', 'DB_PASSWORD_REGULAR',
      'DB_USER_ADMIN', 'DB_PASSWORD_ADMIN'
    ];
    
    const missingVars = requiredVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      throw new Error(`Повреждена структура .env — отсутствуют ключи: ${missingVars.join(', ')}`);
    }
    
    // Проверяем уникальность логинов
    const regularUser = process.env.DB_USER_REGULAR;
    const adminUser = process.env.DB_USER_ADMIN;
    
    if (regularUser === adminUser) {
      throw new Error('Повреждена структура .env — дубликаты логинов не допускаются');
    }
    
    const envData = {
      db_server: process.env.DB_SERVER,
      db_database: process.env.DB_DATABASE,
      users: [
        {
          login: process.env.DB_USER_REGULAR,
          password: process.env.DB_PASSWORD_REGULAR
        },
        {
          login: process.env.DB_USER_ADMIN,
          password: process.env.DB_PASSWORD_ADMIN
        }
      ]
    };
    
    console.log('✓ .env файл успешно проверен и прочитан');
    console.log(`  Найдено пользователей: ${envData.users.length}`);
    
    return envData;
  } catch (error) {
    console.error(`✗ Ошибка при проверке .env файла: ${error.message}`);
    throw error;
  }
}

/**
 * Создание ключа шифрования
 * @returns {Object} - Объект с ключом и именем файла
 */
function createEncryptionKey() {
  const saltDirAbs = path.resolve(SALT_DIR);
  if (!fs.existsSync(saltDirAbs)) {
    fs.mkdirSync(saltDirAbs, { recursive: true });
  }
  
  // Создаем 32-байтный ключ
  const keyBytes = crypto.randomBytes(32);
  const keyHex = keyBytes.toString('hex');
  const keyFileName = 'enc_key.json';
  
  const keyData = {
    salt: keyHex,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(saltDirAbs, keyFileName), JSON.stringify(keyData, null, 2));
  console.log(`  ✓ Ключ шифрования создан: ${keyFileName}`);
  
  return {
    key: keyBytes,
    fileName: keyFileName
  };
}

/**
 * Шифрование текста с использованием заданного ключа
 * @param {string} text - Текст для шифрования
 * @param {Buffer} key - Ключ шифрования
 * @returns {Object} - Зашифрованные данные
 */
function encryptWithKey(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Настройка доступа к СУБД с хешированием всех учетных данных
 */
function setupDatabaseAccess() {
  console.log('=== Настройка доступа к СУБД: хеширование и шифрование ===\n');
  
  try {
    // Предварительно гарантируем наличие файла auth-db.json
    ensureAuthDbFile();

    // Шаг 1: Проверка и чтение .env файла
    const envData = validateAndReadEnvFile();
    
    // Шаг 2: Генерация ключа шифрования и запись в salt/
    console.log('\nПодготовка ключа шифрования...');
    const encryptionKey = createEncryptionKey();

    // Шаг 3: Хеширование всех данных и создание файлов солей
    console.log('\nХеширование данных и создание файлов солей...');
    
    let saltIndex = 1;
    const saltFiles = {};
    
    // Хешируем имя сервера
    const serverHashed = hashData(envData.db_server);
    const serverSaltFile = createSaltFile(saltIndex++, serverHashed.salt);
    saltFiles.server = serverSaltFile;
    
    // Хешируем имя базы данных
    const databaseHashed = hashData(envData.db_database);
    const databaseSaltFile = createSaltFile(saltIndex++, databaseHashed.salt);
    saltFiles.database = databaseSaltFile;
    
    // Хешируем данные пользователей
    const usersWithHashes = {};
    envData.users.forEach((user, index) => {
      // Хешируем логин
      const loginHashed = hashData(user.login);
      const loginSaltFile = createSaltFile(saltIndex++, loginHashed.salt);
      
      // Хешируем пароль
      const passwordHashed = hashData(user.password);
      const passwordSaltFile = createSaltFile(saltIndex++, passwordHashed.salt);
      
      // Сохраняем пользователя в объекте с логином как ключом
      usersWithHashes[user.login] = {
        // Remove the username field since it's redundant with the key
        // and would expose the username in plain text
        login_hash: loginHashed.hash,
        login_salt_file: loginSaltFile,
        password_hash: passwordHashed.hash,
        password_salt_file: passwordSaltFile
      };
    });
    
    console.log(`✓ Все данные хешированы, создано ${saltIndex - 1} файлов солей`);

    // Шаг 4: Шифрование фактических значений для использования в рантайме
    console.log('\nШифрование параметров подключения и учетных данных...');
    const encryptedConfig = {
      server: encryptWithKey(envData.db_server, encryptionKey.key),
      database: encryptWithKey(envData.db_database, encryptionKey.key),
      users: {}
    };
    envData.users.forEach(user => {
      encryptedConfig.users[user.login] = {
        username: encryptWithKey(user.login, encryptionKey.key),
        password: encryptWithKey(user.password, encryptionKey.key)
      };
    });
    
    // Шаг 5: Создание или обновление auth-db.json
    console.log('\nСоздание или обновление auth-db.json...');
    
    const authDb = {
      db_config: {
        server_hash: serverHashed.hash,
        server_salt_file: serverSaltFile,
        database_hash: databaseHashed.hash,
        database_salt_file: databaseSaltFile
      },
      users: usersWithHashes,
      encryption: {
        key_file: encryptionKey.fileName
      },
      encrypted_config: encryptedConfig,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Сохраняем в файл (перезаписываем, если существует)
    fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(authDb, null, 2));
    console.log('✓ Файл auth-db.json успешно создан/обновлен');
    
    // Шаг 6: Вывод информации о созданных файлах
    console.log('\n=== Созданные файлы ===');
    console.log(`auth-db.json - Основной файл с хешами и ссылками на файлы солей`);
    console.log(`Путь к файлам солей: ${path.resolve(SALT_DIR)}`);
    for (let i = 1; i < saltIndex; i++) {
      console.log(`salt${i}.json - Файл соли для одного из параметров`);
    }
    
    console.log('\n=== Настройка завершена успешно ===');
    console.log('Теперь приложение может безопасно подключаться к СУБД, используя хешированные данные');
    
    return true;
  } catch (error) {
    console.error('\n✗ Критическая ошибка при настройке доступа к СУБД:', error.message);
    return false;
  }
}

/**
 * Чтение соли из файла
 * @param {string} saltFileName - Имя файла соли
 * @returns {string} - Соль
 */
function readSaltFromFile(saltFileName) {
  try {
    const saltFilePath = path.join(path.resolve(SALT_DIR), saltFileName);
    const saltData = fs.readFileSync(saltFilePath, 'utf8');
    const saltObj = JSON.parse(saltData);
    return saltObj.salt;
  } catch (error) {
    throw new Error(`Не удалось прочитать файл соли ${saltFileName}: ${error.message}`);
  }
}

/**
 * Проверка данных подключения к СУБД
 * @param {string} server - Имя сервера
 * @param {string} database - Имя базы данных
 * @param {string} username - Имя пользователя
 * @param {string} password - Пароль
 * @returns {boolean} - Соответствуют ли данные хешам в auth-db.json
 */
function verifyDatabaseCredentials(server, database, username, password) {
  try {
    // Читаем auth-db.json
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Проверяем сервер
    const serverSalt = readSaltFromFile(authDb.db_config.server_salt_file);
    const serverHashed = hashData(server, serverSalt);
    if (serverHashed.hash !== authDb.db_config.server_hash) {
      console.log('✗ Неверное имя сервера');
      return false;
    }
    
    // Проверяем базу данных
    const databaseSalt = readSaltFromFile(authDb.db_config.database_salt_file);
    const databaseHashed = hashData(database, databaseSalt);
    if (databaseHashed.hash !== authDb.db_config.database_hash) {
      console.log('✗ Неверное имя базы данных');
      return false;
    }
    
    // Проверяем пользователя
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
    console.error(`✗ Ошибка при проверке учетных данных: ${error.message}`);
    return false;
  }
}

// Если файл запущен напрямую, выполняем настройку
if (require.main === module) {
  const success = setupDatabaseAccess();
  if (!success) {
    process.exit(1);
  }
}

// Экспортируем функции для использования в других модулях
module.exports = {
  setupDatabaseAccess,
  verifyDatabaseCredentials,
  hashData,
  readSaltFromFile
};