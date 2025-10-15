/**
 * Тестовый скрипт для сервиса аутентификации
 */
const { 
  initializeAuthDatabase, 
  getUserCredentials, 
  verifyUserCredentials, 
  updateUserPassword,
  hashPassword,
  verifyPassword
} = require('./auth-service');

console.log('Тестирование сервиса аутентификации...\n');

try {
  // Тест хеширования пароля
  console.log('1. Тестирование хеширования пароля:');
  const password = 'testPassword123';
  const { hash, salt } = hashPassword(password);
  console.log('Пароль успешно хеширован');
  console.log('Длина хеша:', hash.length);
  console.log('Длина соли:', salt.length);
  
  // Тест проверки пароля
  console.log('\n2. Тестирование проверки пароля:');
  const isValid = verifyPassword(password, hash, salt);
  console.log('Результат проверки пароля:', isValid ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  const isInvalid = verifyPassword('wrongPassword', hash, salt);
  console.log('Результат проверки неверного пароля:', !isInvalid ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Инициализация базы данных аутентификации
  console.log('\n3. Инициализация базы данных аутентификации:');
  const authDb = initializeAuthDatabase();
  console.log('База данных аутентификации инициализирована');
  
  // Тест получения учетных данных пользователя
  console.log('\n4. Тестирование получения учетных данных пользователя:');
  const superAdminCreds = getUserCredentials('AppSuperAdmin');
  console.log('Учетные данные суперадмина:', superAdminCreds);
  console.log('Тест 4 результат:', superAdminCreds ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  const regularUserCreds = getUserCredentials('AppSuperUser');
  console.log('Учетные данные обычного пользователя:', regularUserCreds);
  console.log('Тест 5 результат:', regularUserCreds ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Тест аутентификации пользователя
  console.log('\n5. Тестирование аутентификации пользователя:');
  const superAdminAuth = verifyUserCredentials('AppSuperAdmin', 'aA3$!Qp9_superAdminStrongPwd');
  console.log('Аутентификация суперадмина:', superAdminAuth ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  const regularUserAuth = verifyUserCredentials('AppSuperUser', 'uU7@#Kx2_superUserStrongPwd');
  console.log('Аутентификация обычного пользователя:', regularUserAuth ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Тест неверного пароля
  console.log('\n6. Тестирование аутентификации с неверным паролем:');
  const wrongPasswordAuth = verifyUserCredentials('AppSuperAdmin', 'wrongPassword');
  console.log('Аутентификация с неверным паролем:', !wrongPasswordAuth ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Тест несуществующего пользователя
  console.log('\n7. Тестирование аутентификации несуществующего пользователя:');
  const nonExistentUserAuth = verifyUserCredentials('NonExistentUser', 'anyPassword');
  console.log('Аутентификация несуществующего пользователя:', !nonExistentUserAuth ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Тест обновления пароля
  console.log('\n8. Тестирование обновления пароля:');
  const updateResult = updateUserPassword('AppSuperUser', 'newPassword123');
  console.log('Результат обновления пароля:', updateResult ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  // Проверка обновленного пароля
  console.log('\n9. Тестирование обновленного пароля:');
  const updatedPasswordAuth = verifyUserCredentials('AppSuperUser', 'newPassword123');
  console.log('Аутентификация с обновленным паролем:', updatedPasswordAuth ? '✓ ПРОЙДЕН' : '✗ НЕ ПРОЙДЕН');
  
  console.log('\n---\n');
  console.log('Все тесты сервиса аутентификации завершены!');
  
} catch (error) {
  console.error('Тест завершен с ошибкой:', error);
}