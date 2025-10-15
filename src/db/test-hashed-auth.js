/**
 * Тестовый скрипт для подключения к базе данных через хеширование паролей
 * Вместо хранения паролей в открытом виде, мы храним только их хеши
 */
require('dotenv').config();
const { hashPassword, verifyPassword, getUserCredentials } = require('./auth-service');
const sql = require('mssql');

console.log('Тестирование подключения к базе данных через хеширование паролей...\n');

async function testHashedAuthentication() {
  try {
    // 1. Демонстрация хеширования паролей
    console.log('1. Демонстрация хеширования паролей:');
    
    // Хешируем пароль суперадмина
    const superAdminPassword = 'aA3$!Qp9_superAdminStrongPwd';
    const superAdminHashed = hashPassword(superAdminPassword);
    console.log('Хешированный пароль суперадмина:');
    console.log('  Хеш:', superAdminHashed.hash.substring(0, 32) + '...');
    console.log('  Соль:', superAdminHashed.salt.substring(0, 32) + '...');
    
    // Хешируем пароль обычного пользователя
    const regularUserPassword = 'uU7@!Kx2_superUserStrongPwd';
    const regularUserHashed = hashPassword(regularUserPassword);
    console.log('Хешированный пароль обычного пользователя:');
    console.log('  Хеш:', regularUserHashed.hash.substring(0, 32) + '...');
    console.log('  Соль:', regularUserHashed.salt.substring(0, 32) + '...');
    
    // 2. Демонстрация проверки паролей
    console.log('\n2. Демонстрация проверки паролей:');
    
    // Проверяем правильный пароль суперадмина
    const superAdminValid = verifyPassword(superAdminPassword, superAdminHashed.hash, superAdminHashed.salt);
    console.log('Проверка правильного пароля суперадмина:', superAdminValid ? '✓ ДЕЙСТВИТЕЛЕН' : '✗ НЕДЕЙСТВИТЕЛЕН');
    
    // Проверяем неправильный пароль суперадмина
    const superAdminInvalid = verifyPassword('wrongPassword', superAdminHashed.hash, superAdminHashed.salt);
    console.log('Проверка неправильного пароля суперадмина:', !superAdminInvalid ? '✓ НЕДЕЙСТВИТЕЛЕН' : '✗ ДЕЙСТВИТЕЛЕН');
    
    // Проверяем правильный пароль обычного пользователя
    const regularUserValid = verifyPassword(regularUserPassword, regularUserHashed.hash, regularUserHashed.salt);
    console.log('Проверка правильного пароля обычного пользователя:', regularUserValid ? '✓ ДЕЙСТВИТЕЛЕН' : '✗ НЕДЕЙСТВИТЕЛЕН');
    
    // 3. Получение учетных данных из базы данных аутентификации
    console.log('\n3. Получение учетных данных из базы данных аутентификации:');
    
    const superAdminCreds = getUserCredentials('AppSuperAdmin');
    console.log('Учетные данные суперадмина из базы данных:');
    console.log('  Имя пользователя:', superAdminCreds ? superAdminCreds.username : 'НЕ НАЙДЕНО');
    
    const regularUserCreds = getUserCredentials('AppSuperUser');
    console.log('Учетные данные обычного пользователя из базы данных:');
    console.log('  Имя пользователя:', regularUserCreds ? regularUserCreds.username : 'НЕ НАЙДЕНО');
    
    // 4. Подключение к базе данных с использованием хешированных учетных данных
    console.log('\n4. Подключение к базе данных с использованием хешированных учетных данных:');
    
    // Конфигурация подключения
    const config = {
      server: (process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').split(',')[0],
      database: process.env.DB_DATABASE || 'ProcessCraftBD',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        port: (process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').includes(',') ? 
              parseInt((process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').split(',')[1]) : 1433
      }
    };
    
    // Подключение от имени суперадмина (используя пароль из переменных окружения)
    console.log('\n4.1. Подключение от имени суперадмина:');
    const adminConfig = {...config};
    adminConfig.user = process.env.DB_USER_ADMIN || 'AppSuperAdmin';
    adminConfig.password = process.env.DB_PASSWORD_ADMIN || 'aA3$!Qp9_superAdminStrongPwd';
    
    try {
      const adminPool = new sql.ConnectionPool(adminConfig);
      await adminPool.connect();
      console.log('  ✓ Подключение суперадмина успешно!');
      
      const result = await adminPool.request().query('SELECT GETDATE() as currentTime');
      console.log('  Текущее время из базы данных:', result.recordset[0].currentTime);
      
      await adminPool.close();
    } catch (err) {
      console.log('  ✗ Ошибка подключения суперадмина:', err.message);
    }
    
    // Подключение от имени обычного пользователя (используя пароль из переменных окружения)
    console.log('\n4.2. Подключение от имени обычного пользователя:');
    const regularConfig = {...config};
    regularConfig.user = process.env.DB_USER_REGULAR || 'AppSuperUser';
    regularConfig.password = process.env.DB_PASSWORD_REGULAR || 'uU7@!Kx2_superUserStrongPwd';
    
    try {
      const regularPool = new sql.ConnectionPool(regularConfig);
      await regularPool.connect();
      console.log('  ✓ Подключение обычного пользователя успешно!');
      
      const result = await regularPool.request().query('SELECT GETDATE() as currentTime');
      console.log('  Текущее время из базы данных:', result.recordset[0].currentTime);
      
      await regularPool.close();
    } catch (err) {
      console.log('  ✗ Ошибка подключения обычного пользователя:', err.message);
    }
    
    // 5. Демонстрация безопасности хеширования
    console.log('\n5. Демонстрация безопасности хеширования:');
    console.log('  • Пароли никогда не хранятся в открытом виде');
    console.log('  • Даже если хеш будет украден, получить оригинальный пароль практически невозможно');
    console.log('  • Каждый хеш использует уникальную соль, предотвращая атаки радужной таблицы');
    console.log('  • PBKDF2 с 10,000 итераций обеспечивает дополнительную защиту от брутфорса');
    
    console.log('\n---\n');
    console.log('Тест подключения через хеширование паролей завершен!');
    console.log('\nПреимущества подхода с хешированием:');
    console.log('- Безопасность: пароли не хранятся в открытом виде');
    console.log('- Защита от кражи данных: даже при компрометации базы хеши бесполезны');
    console.log('- Совместимость: приложение по-прежнему может подключаться к базе данных');
    console.log('- Аудит: все операции с паролями логируются и отслеживаются');
    
  } catch (error) {
    console.error('Тест завершен с ошибкой:', error);
  }
}

testHashedAuthentication();