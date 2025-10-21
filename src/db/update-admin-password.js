/**
 * Скрипт для обновления пароля пользователя Admin на "1111"
 * Должен выполняться после настройки доступа к базе данных
 */
const { getConnectionPool } = require('./connection');
const { hashPassword } = require('./request/auth-process');

async function updateAdminPassword() {
  try {
    console.log('Обновление пароля пользователя Admin на "1111"');
    
    // Хеширование пароля
    const { hash } = hashPassword('1111');
    
    // Подключение к базе данных
    const pool = await getConnectionPool('superadmin');
    
    // Обновление пароля пользователя Admin
    await pool.request()
      .input('passwordHash', sql.VarChar(255), hash)
      .input('username', sql.VarChar(50), 'Admin')
      .query(`
        UPDATE Users 
        SET PasswordHash = @passwordHash, UpdatedAt = GETDATE()
        WHERE UserName = @username
      `);
    
    console.log('Пароль пользователя Admin успешно обновлен на "1111"');
  } catch (error) {
    console.error('Ошибка обновления пароля Admin:', error);
  }
}

// Добавление импорта sql
const sql = require('mssql');

// Запуск функции, если файл выполняется напрямую
if (require.main === module) {
  updateAdminPassword()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updateAdminPassword };