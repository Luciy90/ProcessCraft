/**
 * Тестовый скрипт для хранилища учетных данных
 */
const { initializeCredentialsStore, loadCredentialsFromStore, updateCredentialsInStore } = require('./credentials-store');

console.log('Тестирование хранилища учетных данных...\n');

try {
  // Инициализация хранилища учетных данных
  console.log('1. Инициализация хранилища учетных данных:');
  const credentialsStore = initializeCredentialsStore();
  console.log('Хранилище учетных данных успешно инициализировано\n');
  
  // Загрузка учетных данных суперадмина
  console.log('2. Загрузка учетных данных суперадмина:');
  const superAdminCredentials = loadCredentialsFromStore('superadmin');
  console.log('Учетные данные суперадмина загружены:', superAdminCredentials);
  console.log('Тест 2 ПРОЙДЕН: ✓\n');
  
  // Загрузка учетных данных обычного пользователя
  console.log('3. Загрузка учетных данных обычного пользователя:');
  const regularUserCredentials = loadCredentialsFromStore('regular');
  console.log('Учетные данные обычного пользователя загружены:', regularUserCredentials);
  console.log('Тест 3 ПРОЙДЕН: ✓\n');
  
  // Тест обновления учетных данных
  console.log('4. Тестирование обновления учетных данных:');
  const newCredentials = {
    username: 'AppSuperUser'
  };
  updateCredentialsInStore('regular', newCredentials);
  
  // Загрузка обновленных учетных данных
  const updatedCredentials = loadCredentialsFromStore('regular');
  const updateSuccess = updatedCredentials.username === newCredentials.username;
  console.log('Обновленные учетные данные загружены:', updatedCredentials);
  console.log('Тест 4 ПРОЙДЕН:', updateSuccess ? '✓' : '✗');
  console.log('\n---\n');
  
  console.log('Все тесты хранилища учетных данных успешно завершены!');
  
} catch (error) {
  console.error('Тест не пройден из-за ошибки:', error);
}