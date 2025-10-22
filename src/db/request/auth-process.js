const crypto = require('crypto');
const { getConnectionPool } = require('../connection');
const sql = require('mssql');

/**
 * Хеширование пароля с использованием PBKDF2 с SHA-512
 * @param {string} password - Пароль для хеширования
 * @param {string} salt - Соль для использования (генерируется, если не указана)
 * @returns {Object} Объект, содержащий хеш и соль
 */
function hashPassword(password, salt = null) {
  // Генерация соли, если не предоставлена
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
  }
  
  // Хеширование пароля с использованием PBKDF2 с SHA-512
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  // Объединение соли и хеша для хранения
  const merged = `${salt}$${hash}`;
  
  return {
    hash: merged,
    salt: salt
  };
}

/**
 * Проверка пароля по сравнению с сохраненным хешем
 * @param {string} password - Пароль для проверки
 * @param {string} storedHash - Сохраненный хеш (соль + хеш)
 * @returns {boolean} Соответствует ли пароль
 */
function verifyPassword(password, storedHash) {
  try {
    // Извлечение соли и хеша из сохраненного значения
    const parts = storedHash.split?.('$');
    if (parts?.length !== 2) {
      return false;
    }
    
    const salt = parts?.[0];
    const hash = parts?.[1];
    
    // Хеширование предоставленного пароля с извлеченной солью
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    // Сравнение хешей
    return hashedPassword === hash;
  } catch (error) {
    console.error('Ошибка проверки пароля:', error);
    return false;
  }
}

/**
 * Обновление хеша пароля пользователя в базе данных
 * @param {string} username - Имя пользователя
 * @param {string} newPassword - Новый пароль
 * @returns {boolean} Успешно ли обновление
 */
async function updateUserPassword(username, newPassword) {
  try {
    // Хеширование нового пароля
    const { hash } = hashPassword(newPassword);
    
    // Получение пула подключений суперадминистратора для привилегированной операции
    const pool = await getConnectionPool('superadmin');
    
    // Обновление хеша пароля в базе данных
    await pool.request()
      .input('passwordHash', sql.VarChar(255), hash)
      .input('username', sql.VarChar(50), username)
      .query(`
        UPDATE Users 
        SET PasswordHash = @passwordHash, UpdatedAt = GETDATE()
        WHERE UserName = @username
      `);    
    return true;
  } catch (error) {
    console.error('Ошибка обновления пароля пользователя:', error);
    return false;
  }
}

/**
 * Создание нового пользователя с хешированным паролем
 * @param {Object} userData - Данные пользователя
 * @returns {boolean} Успешно ли создание
 */
async function createNewUser(userData) {
  try {
    const {
      username,
      password,
      displayName,
      email,
      phone,
      department,
      position,
      isSuperAdmin = false,
      avatarColor = { hue: 0, saturation: 80, brightness: 80 }
    } = userData ?? {};
    
    // Хеширование пароля
    const { hash } = hashPassword(password);
    
    // Получение пула подключений суперадминистратора для привилегированной операции
    const pool = await getConnectionPool?.('superadmin');
    
    // Вставка нового пользователя в базу данных
    await pool.request?.()
      .input?.('displayName', sql.NVarChar(100), displayName)
      .input?.('username', sql.VarChar(50), username)
      .input?.('email', sql.VarChar(100), email)
      .input?.('phone', sql.VarChar(20), phone)
      .input?.('department', sql.NVarChar(100), department)
      .input?.('position', sql.NVarChar(100), position)
      .input?.('passwordHash', sql.VarChar(255), hash)
      .input?.('isSuperAdmin', sql.Bit, isSuperAdmin ? 1 : 0)
      .input?.('avatarColorHue', sql.Int, avatarColor?.hue)
      .input?.('avatarColorSaturation', sql.Int, avatarColor?.saturation)
      .input?.('avatarColorBrightness', sql.Int, avatarColor?.brightness)
      .query?.(`
        INSERT INTO Users (
          DisplayName, UserName, Email, Phone, Department, Position, 
          PasswordHash, IsSuperAdmin, AvatarColorHue, AvatarColorSaturation, AvatarColorBrightness,
          CreatedAt, UpdatedAt
        ) VALUES (
          @displayName, @username, @email, @phone, @department, @position,
          @passwordHash, @isSuperAdmin, @avatarColorHue, @avatarColorSaturation, @avatarColorBrightness,
          GETDATE(), GETDATE()
        )
      `);
    
    return true;
  } catch (error) {
    console.error('Ошибка создания нового пользователя:', error);
    return false;
  }
}

/**
 * Обновление времени последнего входа для пользователя
 * @param {string} username - Имя пользователя
 * @returns {boolean} Успешно ли обновление
 */
async function updateLastLogin(username) {
  try {
    // Получение обычного пула подключений
    const pool = await getConnectionPool('regular');
    
    // Обновление времени последнего входа
    await pool.request()
      .input('username', sql.VarChar(50), username)
      .query(`
        UPDATE Users 
        SET LastLoginAt = GETDATE()
        WHERE UserName = @username
      `);
    
    return true;
  } catch (error) {
    console.error('Ошибка обновления времени последнего входа:', error);
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  updateUserPassword,
  createNewUser,
  updateLastLogin
}; 