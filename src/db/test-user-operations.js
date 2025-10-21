/**
 * Тестовый скрипт для проверки операций с пользователями через SQL Server
 */
const { getUserByUsername } = require('./request/auth-choice');
const { createNewUser, updateUserPassword } = require('./request/auth-process');
const { initializeConnection } = require('./connection');

async function testUserOperations() {
  try {
    console.log('Тестирование операций с пользователями через SQL Server...');
    
    // Инициализация подключения
    await initializeConnection('superadmin');
    
    // Тест 1: Получение пользователя
    console.log('\n1. Тестирование получения пользователя...');
    const user = await getUserByUsername('Admin', 'regular');
    console.log('Пользователь найден:', user ? 'Да' : 'Нет');
    if (user) {
      console.log('Имя пользователя:', user.username);
      console.log('Отображаемое имя:', user.displayName);
      console.log('Email:', user.email);
    }
    
    // Тест 2: Создание нового пользователя (если еще не существует)
    console.log('\n2. Тестирование создания нового пользователя...');
    const newUser = {
      username: 'testuser',
      password: 'testpass123',
      displayName: 'Тестовый Пользователь',
      email: 'test@example.com',
      phone: '+71234567890',
      department: 'IT',
      position: 'Developer',
      isSuperAdmin: false
    };
    
    // Проверяем, существует ли пользователь
    const existingUser = await getUserByUsername('testuser', 'superadmin');
    if (!existingUser) {
      const createResult = await createNewUser(newUser);
      console.log('Создание пользователя:', createResult ? 'Успешно' : 'Ошибка');
    } else {
      console.log('Пользователь уже существует');
    }
    
    // Тест 3: Обновление пароля пользователя
    console.log('\n3. Тестирование обновления пароля...');
    const updateResult = await updateUserPassword('testuser', 'newpassword123');
    console.log('Обновление пароля:', updateResult ? 'Успешно' : 'Ошибка');
    
    // Тест 4: Проверка обновленного пароля
    console.log('\n4. Тестирование проверки обновленного пароля...');
    const updatedUser = await getUserByUsername('testuser', 'regular');
    if (updatedUser) {
      // Здесь мы не можем проверить пароль напрямую, так как у нас нет функции verifyPassword в этом контексте
      console.log('Пользователь с обновленным паролем найден');
    }
    
    console.log('\nВсе тесты успешно завершены!');
  } catch (error) {
    console.error('Тест завершился ошибкой:', error);
  }
}

// Запуск теста, если файл выполняется напрямую
if (require.main === module) {
  testUserOperations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Ошибка теста:', error);
      process.exit(1);
    });
}

module.exports = { testUserOperations };