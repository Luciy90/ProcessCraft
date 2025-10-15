/**
 * Модуль шифрования/дешифрования для учетных данных базы данных
 * Использует AES-256-GCM для аутентифицированного шифрования
 */
const crypto = require('crypto');

// Секретный ключ для шифрования/дешифрования
// В производственной среде это должно храниться безопасно (например, переменные окружения, служба управления ключами)
const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('ENCRYPTION_SECRET_KEY environment variable must be set');
}

/**
 * Шифрует текст с использованием AES-256-GCM
 * @param {string} text - Текст для шифрования
 * @returns {Object} - Объект с зашифрованными данными, IV, тегом аутентификации и солью
 */
function encrypt(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Input must be a non-empty string');
  }

  // Генерируем случайную соль для KDF
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET_KEY, salt, 32);
  
  // Генерируем случайный вектор инициализации
  const iv = crypto.randomBytes(16);
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
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex')
  };
}

/**
 * Дешифрует зашифрованные данные с использованием AES-256-GCM
 * @param {Object} encryptedObj - Объект, содержащий зашифрованные данные, IV и тег аутентификации
 * @returns {string} - Расшифрованный текст
 */
function decrypt(encryptedObj) {
  const { encryptedData, iv, authTag, salt } = encryptedObj;

  // Создаем дешифратор с использованием createDecipheriv
  const key = crypto.scryptSync(SECRET_KEY, Buffer.from(salt, 'hex'), 32);
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
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Invalid credentials object');
  }

  if (!credentials.username || !credentials.password) {
    throw new Error('Credentials must contain username and password');
  }
  
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