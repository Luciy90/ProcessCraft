/**
 * Модуль шифрования/дешифрования для учетных данных базы данных
 * Использует AES-256-GCM для аутентифицированного шифрования
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load encryption key from salt file referenced in auth-db.json
function loadEncryptionKey() {
  const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');
  try {
    // Проверяем, существует ли файл auth-db.json
    if (!fs.existsSync(AUTH_DB_FILE)) {
      // Если файл не существует, возвращаем null
      // Это может произойти во время первоначальной настройки
      return null;
    }
    
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    if (!authDb.encryption || !authDb.encryption.key_file) {
      throw new Error('encryption.key_file is not defined in auth-db.json');
    }
    const keyFilePath = path.join(__dirname, 'src/salt', authDb.encryption.key_file);
    const keyFile = fs.readFileSync(keyFilePath, 'utf8');
    const keyObj = JSON.parse(keyFile);
    const keyHex = keyObj.salt; // store 32-byte hex in the file
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }
    return key;
  } catch (err) {
    // Если файл не существует или возникла другая ошибка, возвращаем null
    // Это может произойти во время первоначальной настройки
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error('Failed to load encryption key: ' + err.message);
  }
}

// Encryption key is loaded from salt file specified in auth-db.json
let ENCRYPTION_KEY;
function getKey() {
  if (!ENCRYPTION_KEY) {
    ENCRYPTION_KEY = loadEncryptionKey();
  }
  return ENCRYPTION_KEY;
}

/**
 * Шифрует текст с использованием AES-256-GCM
 * @param {string} text - Текст для шифрования
 * @returns {Object} - Объект, содержащий зашифрованные данные, IV и тег аутентификации
 */
function encrypt(text) {
  // Проверяем, доступен ли ключ шифрования
  const key = getKey();
  if (!key) {
    throw new Error('Encryption key is not available. Run setup-db-access.js first.');
  }
  
  // Генерируем случайный вектор инициализации
  const iv = crypto.randomBytes(16);
  
  // Создаем шифр с использованием createCipheriv
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Шифруем текст
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Получаем тег аутентификации
  const authTag = cipher.getAuthTag();
  
  // Возвращаем зашифрованные данные с IV и тегом аутентификации
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Дешифрует зашифрованные данные с использованием AES-256-GCM
 * @param {Object} encryptedObj - Объект, содержащий зашифрованные данные, IV и тег аутентификации
 * @returns {string} - Расшифрованный текст
 */
function decrypt(encryptedObj) {
  // Проверяем, доступен ли ключ шифрования
  const key = getKey();
  if (!key) {
    throw new Error('Encryption key is not available. Run setup-db-access.js first.');
  }
  
  const { encryptedData, iv, authTag } = encryptedObj;
  
  // Создаем дешифратор с использованием createDecipheriv
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  
  // Устанавливаем тег аутентификации
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  // Дешифруем данные
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Создает зашифрованные учетные данные для различных типов пользователей
 * @param {string} userType - Тип пользователя ('superadmin' или 'regular')
 * @param {Object} credentials - Объект учетных данных { username, password }
 * @returns {Object} - Зашифрованные учетные данные
 */
function createEncryptedCredentials(userType, credentials) {
  // Мы могли бы реализовать разное шифрование для суперадмина и обычных пользователей
  // Пока что мы будем использовать одно и то же шифрование, но можем расширить это позже
  
  return {
    userType,
    encryptedUsername: encrypt(credentials.username),
    encryptedPassword: encrypt(credentials.password),
    createdAt: new Date().toISOString()
  };
}

/**
 * Дешифрует учетные данные
 * @param {Object} encryptedCredentials - Объект зашифрованных учетных данных
 * @returns {Object} - Расшифрованные учетные данные { username, password }
 */
function decryptCredentials(encryptedCredentials) {
  try {
    const username = decrypt(encryptedCredentials.encryptedUsername);
    const password = decrypt(encryptedCredentials.encryptedPassword);
    
    return {
      userType: encryptedCredentials.userType,
      username,
      password
    };
  } catch (error) {
    throw new Error('Не удалось дешифровать учетные данные: ' + error.message);
  }
}

module.exports = {
  encrypt,
  decrypt,
  createEncryptedCredentials,
  decryptCredentials
};