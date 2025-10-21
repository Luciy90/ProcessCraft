/**
 * Простой скрипт для тестирования подключения к базе данных
 */
const { initializeConnection } = require('./connection');

async function testConnection() {
  try {
    console.log('Тестирование подключения к базе данных...');
    const pool = await initializeConnection('regular');
    console.log('Подключение успешно!');
    
    // Тест простого запроса
    const result = await pool.request().query('SELECT 1 as connected');
    console.log('Результат запроса:', result.recordset);
    
    // Закрытие подключения
    await pool.close();
    console.log('Подключение закрыто.');
  } catch (error) {
    console.error('Подключение не удалось:', error);
  }
}

// Запуск теста, если файл выполняется напрямую
if (require.main === module) {
  testConnection()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Ошибка теста:', error);
      process.exit(1);
    });
}

module.exports = { testConnection };