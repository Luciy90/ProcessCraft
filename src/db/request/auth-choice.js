const { getConnectionPool } = require('../connection');

/**
 * Получение пользователя по имени с выбором типа подключения
 * @param {string} username - Имя пользователя для поиска
 * @param {string} connectionType - Тип подключения для использования ('regular' или 'superadmin')
 * @returns {Object|null} Данные пользователя или null, если не найден
 */
async function getUserByUsername(username, connectionType = 'regular') {
  try {
    // Получение соответствующего пула подключений
    const pool = await getConnectionPool(connectionType);
    
    // Запрос для получения данных пользователя с фильтром мягкого удаления
    const result = await pool.request()
      .input('username', sql.VarChar(50), username)
      .query(`
        SELECT 
          UserID,
          DisplayName,
          UserName,
          Email,
          Phone,
          Department,
          Position,
          PasswordHash,
          IsSuperAdmin,
          IsActive,
          AvatarPath,
          AvatarColorHue,
          AvatarColorSaturation,
          AvatarColorBrightness,
          CoverPath,
          CreatedAt,
          LastLoginAt,
          UpdatedAt
        FROM Users 
        WHERE UserName = @username AND IsActive = 1
      `);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    const userData = result.recordset[0];
    
    // Преобразование данных цвета аватара обратно в объект
    const user = {
      userID: userData.UserID,
      displayName: userData.DisplayName,
      username: userData.UserName,
      email: userData.Email,
      phone: userData.Phone,
      department: userData.Department,
      position: userData.Position,
      passwordHash: userData.PasswordHash,
      isSuperAdmin: userData.IsSuperAdmin === 1,
      isActive: userData.IsActive === 1,
      avatarPath: userData.AvatarPath,
      avatarColor: {
        hue: userData.AvatarColorHue,
        saturation: userData.AvatarColorSaturation,
        brightness: userData.AvatarColorBrightness
      },
      coverPath: userData.CoverPath,
      createdAt: userData.CreatedAt,
      lastLoginAt: userData.LastLoginAt,
      updatedAt: userData.UpdatedAt
    };
    
    return user;
  } catch (error) {
    console.error('Ошибка получения пользователя по имени:', error);
    throw error;
  }
}

/**
 * Получение всех активных пользователей
 * @param {string} connectionType - Тип подключения для использования ('regular' или 'superadmin')
 * @returns {Array} Массив активных пользователей
 */
async function getAllActiveUsers(connectionType = 'regular') {
  try {
    // Получение соответствующего пула подключений
    const pool = await getConnectionPool(connectionType);
    
    // Запрос для получения всех активных пользователей
    const result = await pool.request()
      .query(`
        SELECT 
          UserID,
          DisplayName,
          UserName,
          Email,
          Phone,
          Department,
          Position,
          IsSuperAdmin,
          IsActive,
          AvatarPath,
          AvatarColorHue,
          AvatarColorSaturation,
          AvatarColorBrightness,
          CoverPath,
          CreatedAt,
          LastLoginAt,
          UpdatedAt
        FROM Users 
        WHERE IsActive = 1
      `);
    
    // Преобразование данных для каждого пользователя
    const users = result.recordset.map(userData => ({
      userID: userData.UserID,
      displayName: userData.DisplayName,
      username: userData.UserName,
      email: userData.Email,
      phone: userData.Phone,
      department: userData.Department,
      position: userData.Position,
      isSuperAdmin: userData.IsSuperAdmin === 1,
      isActive: userData.IsActive === 1,
      avatarPath: userData.AvatarPath,
      avatarColor: {
        hue: userData.AvatarColorHue,
        saturation: userData.AvatarColorSaturation,
        brightness: userData.AvatarColorBrightness
      },
      coverPath: userData.CoverPath,
      createdAt: userData.CreatedAt,
      lastLoginAt: userData.LastLoginAt,
      updatedAt: userData.UpdatedAt
    }));
    
    return users;
  } catch (error) {
    console.error('Ошибка получения всех активных пользователей:', error);
    throw error;
  }
}

/**
 * Получение неактивных пользователей (для административных целей)
 * @param {string} connectionType - Тип подключения для использования ('regular' или 'superadmin')
 * @returns {Array} Массив неактивных пользователей
 */
async function getInactiveUsers(connectionType = 'superadmin') {
  try {
    // Только суперадминистратор может получить доступ к неактивным пользователям
    if (connectionType !== 'superadmin') {
      throw new Error('Только суперадминистратор может получить доступ к неактивным пользователям');
    }
    
    // Получение соответствующего пула подключений
    const pool = await getConnectionPool(connectionType);
    
    // Запрос для получения всех неактивных пользователей
    const result = await pool.request()
      .query(`
        SELECT 
          UserID,
          DisplayName,
          UserName,
          Email,
          Phone,
          Department,
          Position,
          IsSuperAdmin,
          IsActive,
          AvatarPath,
          AvatarColorHue,
          AvatarColorSaturation,
          AvatarColorBrightness,
          CoverPath,
          CreatedAt,
          LastLoginAt,
          UpdatedAt
        FROM Users 
        WHERE IsActive = 0
      `);
    
    // Преобразование данных для каждого пользователя
    const users = result.recordset.map(userData => ({
      userID: userData.UserID,
      displayName: userData.DisplayName,
      username: userData.UserName,
      email: userData.Email,
      phone: userData.Phone,
      department: userData.Department,
      position: userData.Position,
      isSuperAdmin: userData.IsSuperAdmin === 1,
      isActive: userData.IsActive === 1,
      avatarPath: userData.AvatarPath,
      avatarColor: {
        hue: userData.AvatarColorHue,
        saturation: userData.AvatarColorSaturation,
        brightness: userData.AvatarColorBrightness
      },
      coverPath: userData.CoverPath,
      createdAt: userData.CreatedAt,
      lastLoginAt: userData.LastLoginAt,
      updatedAt: userData.UpdatedAt
    }));
    
    return users;
  } catch (error) {
    console.error('Ошибка получения неактивных пользователей:', error);
    throw error;
  }
}

// Добавление импорта sql
const sql = require('mssql');

module.exports = {
  getUserByUsername,
  getAllActiveUsers,
  getInactiveUsers
};