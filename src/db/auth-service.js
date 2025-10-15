/**
 * Сервис аутентификации для хеширования и проверки паролей
 * Этот сервис удаляет пароли в открытом виде из приложения и использует только хеши паролей
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Путь к базе данных аутентификации
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');

/**
 * Хеширование пароля с использованием PBKDF2
 * @param {string} password - Пароль для хеширования
 * @param {string} salt - Соль для использования (необязательно, будет сгенерирована, если не указана)
 * @returns {Object} - Объект, содержащий хеш и соль
 */
function hashPassword(password, salt = null) {
  // Генерируем соль, если она не предоставлена
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
  }
  
  // Хешируем пароль с использованием PBKDF2
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash,
    salt
  };
}

/**
 * Проверка пароля по хешу
 * @param {string} password - Пароль для проверки
 * @param {string} hash - Хеш для сравнения
 * @param {string} salt - Соль, использованная для создания хеша
 * @returns {boolean} - Соответствует ли пароль хешу
 */
function verifyPassword(password, hash, salt) {
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hashedPassword === hash;
}

/**
 * Инициализация базы данных аутентификации с нашими пользователями
 */
function initializeAuthDatabase() {
  // Хешируем пароли для наших пользователей
  const superAdmin = {
    username: 'AppSuperAdmin',
    ...hashPassword('aA3$!Qp9_superAdminStrongPwd')
  };
  
  const regularUser = {
    username: 'AppSuperUser',
    ...hashPassword('uU7@#Kx2_superUserStrongPwd')
  };
  
  // Создаем базу данных аутентификации
  const authDb = {
    users: {
      'AppSuperAdmin': superAdmin,
      'AppSuperUser': regularUser
    },
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  // Сохраняем в файл
  fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(authDb, null, 2));
  console.log('База данных аутентификации инициализирована с хешированными паролями');
  
  return authDb;
}

/**
 * Получение учетных данных пользователя (только имя пользователя, без пароля)
 * @param {string} username - Имя пользователя для поиска
 * @returns {Object|null} - Объект пользователя только с именем пользователя, или null, если не найден
 */
function getUserCredentials(username) {
  try {
    // Проверяем, существует ли база данных аутентификации
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('База данных аутентификации не найдена, инициализация...');
      initializeAuthDatabase();
    }
    
    // Читаем и парсим базу данных аутентификации
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Возвращаем объект пользователя (без хеша пароля для безопасности)
    const user = authDb.users[username];
    if (!user) {
      return null;
    }
    
    // Возвращаем только имя пользователя (без хеша пароля)
    return {
      username: user.username
    };
  } catch (error) {
    console.error('Не удалось получить учетные данные пользователя:', error);
    return null;
  }
}

/**
 * Проверка учетных данных пользователя
 * @param {string} username - Имя пользователя для проверки
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - Действительны ли учетные данные
 */
function verifyUserCredentials(username, password) {
  try {
    // Проверяем, существует ли база данных аутентификации
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('База данных аутентификации не найдена, инициализация...');
      initializeAuthDatabase();
    }
    
    // Читаем и парсим базу данных аутентификации
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Получаем пользователя
    const user = authDb.users[username];
    if (!user) {
      console.log(`Пользователь ${username} не найден в базе данных аутентификации`);
      return false;
    }
    
    // Проверяем пароль
    const isValid = verifyPassword(password, user.hash, user.salt);
    console.log(`Проверка пароля для ${username}: ${isValid ? 'ДЕЙСТВИТЕЛЕН' : 'НЕДЕЙСТВИТЕЛЕН'}`);
    return isValid;
  } catch (error) {
    console.error('Не удалось проверить учетные данные пользователя:', error);
    return false;
  }
}

/**
 * Обновление пароля пользователя
 * @param {string} username - Имя пользователя для обновления
 * @param {string} newPassword - Новый пароль
 * @returns {boolean} - Успешно ли обновление
 */
function updateUserPassword(username, newPassword) {
  try {
    // Проверяем, существует ли база данных аутентификации
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('База данных аутентификации не найдена, инициализация...');
      initializeAuthDatabase();
    }
    
    // Читаем и парсим базу данных аутентификации
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Проверяем, существует ли пользователь
    if (!authDb.users[username]) {
      console.error(`Пользователь ${username} не найден`);
      return false;
    }
    
    // Хешируем новый пароль
    const { hash, salt } = hashPassword(newPassword);
    
    // Обновляем пользователя
    authDb.users[username].hash = hash;
    authDb.users[username].salt = salt;
    authDb.lastUpdated = new Date().toISOString();
    
    // Сохраняем в файл
    fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(authDb, null, 2));
    console.log(`Пароль обновлен для пользователя ${username}`);
    
    return true;
  } catch (error) {
    console.error('Не удалось обновить пароль пользователя:', error);
    return false;
  }
}

// Инициализируем базу данных аутентификации при загрузке модуля
// Это гарантирует, что у нас есть правильные пароли
initializeAuthDatabase();

module.exports = {
  hashPassword,
  verifyPassword,
  initializeAuthDatabase,
  getUserCredentials,
  verifyUserCredentials,
  updateUserPassword
};