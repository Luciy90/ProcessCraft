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
    
    // Запрос для получения данных пользователя с фильтром мягкого удаления и ролями
    const result = await pool.request()
      .input('username', sql.VarChar(50), username)
      .query(`
        SELECT 
          u.UserID,
          u.DisplayName,
          u.UserName,
          u.Email,
          u.Phone,
          u.Department,
          u.Position,
          u.PasswordHash,
          u.IsSuperAdmin,
          u.IsActive,
          u.AvatarPath,
          u.AvatarColorHue,
          u.AvatarColorSaturation,
          u.AvatarColorBrightness,
          u.CoverPath,
          u.CreatedAt,
          u.LastLoginAt,
          u.UpdatedAt
        FROM Users u
        WHERE u.UserName = @username AND u.IsActive = 1
      `);
    
    if (result.recordset?.length === 0) {
      return null;
    }
    
    const userData = result.recordset?.[0];
    
    // Получение ролей пользователя
    const rolesResult = await pool.request()
      .input('userId', sql.Int, userData?.UserID)
      .query(`
        SELECT r.RoleName
        FROM UserRoles ur
        JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userId
      `);
    
    const roles = rolesResult.recordset?.map(role => role?.RoleName) ?? [];
    
    // Преобразование данных цвета аватара обратно в объект
    const user = {
      userID: userData?.UserID,
      displayName: userData?.DisplayName,
      username: userData?.UserName,
      email: userData?.Email,
      phone: userData?.Phone,
      department: userData?.Department,
      position: userData?.Position,
      passwordHash: userData?.PasswordHash,
      isSuperAdmin: userData?.IsSuperAdmin === true || userData?.IsSuperAdmin === 1, // Исправлено: проверка как булевого, так и числового значения
      isActive: userData?.IsActive === true || userData?.IsActive === 1,
      avatarPath: userData?.AvatarPath,
      avatarColor: {
        hue: userData?.AvatarColorHue,
        saturation: userData?.AvatarColorSaturation,
        brightness: userData?.AvatarColorBrightness
      },
      coverPath: userData?.CoverPath,
      createdAt: userData?.CreatedAt,
      lastLoginAt: userData?.LastLoginAt,
      updatedAt: userData?.UpdatedAt,
      roles: roles // Добавляем массив ролей
    };
    
    return user;
  } catch (error) {
    console.error('Ошибка получения пользователя по имени:', error);
    throw error;
  }
}

/**
 * Получение соответствующего пула подключений для пользователя
 * @param {Object} userProfile - Профиль пользователя
 * @returns {Object} Пул подключений
 */
async function getPoolForUser(userProfile) {
  try {
    // Строго проверяем флаг IsSuperAdmin для выбора пула
    if (userProfile?.isSuperAdmin === true) {
      // Используем пул AppSuperAdmin для пользователей с флагом IsSuperAdmin
      return await getConnectionPool('superadmin');
    } else {
      // По умолчанию используем пул AppSuperUser
      return await getConnectionPool('regular');
    }
  } catch (error) {
    console.error('Ошибка получения пула подключений для пользователя:', error);
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
    const users = result.recordset?.map(userData => ({
      userID: userData?.UserID,
      displayName: userData?.DisplayName,
      username: userData?.UserName,
      email: userData?.Email,
      phone: userData?.Phone,
      department: userData?.Department,
      position: userData?.Position,
      isSuperAdmin: userData?.IsSuperAdmin === true || userData?.IsSuperAdmin === 1, // Исправлено: проверка как булевого, так и числового значения
      isActive: userData?.IsActive === true || userData?.IsActive === 1,
      avatarPath: userData?.AvatarPath,
      avatarColor: {
        hue: userData?.AvatarColorHue,
        saturation: userData?.AvatarColorSaturation,
        brightness: userData?.AvatarColorBrightness
      },
      coverPath: userData?.CoverPath,
      createdAt: userData?.CreatedAt,
      lastLoginAt: userData?.LastLoginAt,
      updatedAt: userData?.UpdatedAt
    })) ?? [];
    
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
    const users = result.recordset?.map(userData => ({
      userID: userData?.UserID,
      displayName: userData?.DisplayName,
      username: userData?.UserName,
      email: userData?.Email,
      phone: userData?.Phone,
      department: userData?.Department,
      position: userData?.Position,
      isSuperAdmin: userData?.IsSuperAdmin === true || userData?.IsSuperAdmin === 1, // Исправлено: проверка как булевого, так и числового значения
      isActive: userData?.IsActive === true || userData?.IsActive === 1,
      avatarPath: userData?.AvatarPath,
      avatarColor: {
        hue: userData?.AvatarColorHue,
        saturation: userData?.AvatarColorSaturation,
        brightness: userData?.AvatarColorBrightness
      },
      coverPath: userData?.CoverPath,
      createdAt: userData?.CreatedAt,
      lastLoginAt: userData?.LastLoginAt,
      updatedAt: userData?.UpdatedAt
    })) ?? [];
    
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
  getPoolForUser,
  getAllActiveUsers,
  getInactiveUsers
};