// Тестовый скрипт для подключения к базе данных
require('dotenv').config();
const { poolPromise, initializeConnection, verifyUserCredentials } = require('./connection');

console.log('Тестирование подключения к базе данных...');

async function testConnections() {
  try {
    // Тест аутентификации пользователей
    console.log('1. Тестирование аутентификации пользователей:');
    
    const superAdminAuth = verifyUserCredentials('AppSuperAdmin', 'aA3$!Qp9_superAdminStrongPwd');
    console.log('Аутентификация суперадмина:', superAdminAuth ? '✓ УСПЕШНО' : '✗ НЕ УДАЛАСЬ');
    
    const regularUserAuth = verifyUserCredentials('AppSuperUser', 'uU7@#Kx2_superUserStrongPwd');
    console.log('Аутентификация обычного пользователя:', regularUserAuth ? '✓ УСПЕШНО' : '✗ НЕ УДАЛАСЬ');
    
    console.log('\n2. Тестирование подключения к базе данных:');
    
    // Тест с обычным пользователем
    console.log('Тестирование подключения обычного пользователя...');
    const pool = await poolPromise;
    console.log('Тест подключения успешен в качестве обычного пользователя!');
    
    // Выполняем простой запрос для проверки функциональности
    const result = await pool.request().query('SELECT GETDATE() as currentTime');
    console.log('Запрос выполнен успешно:');
    console.log('Текущее время из базы данных:', result.recordset[0].currentTime);
    
    // Тест подключения суперадмина
    console.log('\nТестирование подключения суперадмина...');
    const superAdminPool = await initializeConnection('superadmin');
    console.log('Тест подключения суперадмина успешен!');
    
    const superAdminResult = await superAdminPool.request().query('SELECT GETDATE() as currentTime');
    console.log('Запрос суперадмина выполнен успешно:');
    console.log('Текущее время из базы данных:', superAdminResult.recordset[0].currentTime);
    
    console.log('\n---\n');
    console.log('Все тесты успешно завершены!');
  } catch (err) {
    console.error('Тест не пройден:', err);
  } finally {
    console.log('Тест завершен.');
  }
}

testConnections();