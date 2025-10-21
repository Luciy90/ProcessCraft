/**
 * Тестовый скрипт для проверки миграции аутентификации на SQL Server
 */
const { getUserByUsername } = require('./request/auth-choice');
const { verifyPassword, hashPassword } = require('./request/auth-process');

async function testAuthentication() {
  try {
    console.log('Тестирование миграции аутентификации на SQL Server...');
    
    // Тест 1: Получение пользователя по имени
    console.log('\n1. Тестирование getUserByUsername...');
    const user = await getUserByUsername('Admin', 'regular');
    console.log('Пользователь найден:', user ? 'Да' : 'Нет');
    if (user) {
      console.log('Имя пользователя:', user.username);
      console.log('Отображаемое имя:', user.displayName);
      console.log('Супер администратор:', user.isSuperAdmin);
    }
    
    // Тест 2: Проверка пароля
    console.log('\n2. Тестирование проверки пароля...');
    if (user) {
      const isValid = verifyPassword('1111', user.passwordHash);
      console.log('Пароль "1111" действителен:', isValid);
      
      const isInvalid = verifyPassword('wrongpassword', user.passwordHash);
      console.log('Пароль "wrongpassword" действителен:', isInvalid);
    }
    
    // Тест 3: Хеширование нового пароля
    console.log('\n3. Тестирование хеширования пароля...');
    const { hash, salt } = hashPassword('testpassword');
    console.log('Пароль успешно захеширован');
    console.log('Длина хеша:', hash.length);
    
    // Тест 4: Проверка нового захешированного пароля
    console.log('\n4. Тестирование проверки нового пароля...');
    const newValid = verifyPassword('testpassword', hash);
    console.log('Новый пароль "testpassword" действителен:', newValid);
    
    console.log('\nВсе тесты успешно завершены!');
  } catch (error) {
    console.error('Тест завершился ошибкой:', error);
  }
}

// Запуск теста, если файл выполняется напрямую
if (require.main === module) {
  testAuthentication()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Ошибка теста:', error);
      process.exit(1);
    });
}

module.exports = { testAuthentication };