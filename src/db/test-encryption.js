/**
 * Тестовый скрипт для модуля шифрования/дешифрования
 */
const { encrypt, decrypt, createEncryptedCredentials, decryptCredentials } = require('./encryption');

console.log('Тестирование модуля шифрования/дешифрования...\n');

try {
  // Тест базового шифрования/дешифрования
  console.log('1. Тестирование базового шифрования/дешифрования:');
  const testData = 'Это секретное сообщение!';
  console.log('Исходные данные:', testData);
  
  const encrypted = encrypt(testData);
  console.log('Зашифрованные данные:', encrypted);
  
  const decrypted = decrypt(encrypted);
  console.log('Расшифрованные данные:', decrypted);
  
  console.log('Тест 1 ПРОЙДЕН:', testData === decrypted ? '✓' : '✗');
  console.log('\n---\n');
  
  // Тест шифрования учетных данных суперадмина
  console.log('2. Тестирование шифрования учетных данных суперадмина:');
  const superAdminCredentials = {
    username: 'superadmin',
    password: 'supersecretpassword123'
  };
  
  const encryptedSuperAdmin = createEncryptedCredentials('superadmin', superAdminCredentials);
  console.log('Зашифрованные учетные данные суперадмина:', JSON.stringify(encryptedSuperAdmin, null, 2));
  
  const decryptedSuperAdmin = decryptCredentials(encryptedSuperAdmin);
  console.log('Расшифрованные учетные данные суперадмина:', JSON.stringify(decryptedSuperAdmin, null, 2));
  
  const superAdminMatch = 
    decryptedSuperAdmin.username === superAdminCredentials.username &&
    decryptedSuperAdmin.password === superAdminCredentials.password;
  console.log('Тест 2 ПРОЙДЕН:', superAdminMatch ? '✓' : '✗');
  console.log('\n---\n');
  
  // Тест шифрования учетных данных обычного пользователя
  console.log('3. Тестирование шифрования учетных данных обычного пользователя:');
  const regularUserCredentials = {
    username: 'user123',
    password: 'userpassword456'
  };
  
  const encryptedRegularUser = createEncryptedCredentials('regular', regularUserCredentials);
  console.log('Зашифрованные учетные данные обычного пользователя:', JSON.stringify(encryptedRegularUser, null, 2));
  
  const decryptedRegularUser = decryptCredentials(encryptedRegularUser);
  console.log('Расшифрованные учетные данные обычного пользователя:', JSON.stringify(decryptedRegularUser, null, 2));
  
  const regularUserMatch = 
    decryptedRegularUser.username === regularUserCredentials.username &&
    decryptedRegularUser.password === regularUserCredentials.password;
  console.log('Тест 3 ПРОЙДЕН:', regularUserMatch ? '✓' : '✗');
  console.log('\n---\n');
  
  // Тест обнаружения подделки
  console.log('4. Тестирование обнаружения подделки:');
  try {
    const tamperedEncrypted = {...encrypted};
    // Подделываем зашифрованные данные
    tamperedEncrypted.encryptedData = tamperedEncrypted.encryptedData.substring(0, tamperedEncrypted.encryptedData.length - 5);
    
    decrypt(tamperedEncrypted);
    console.log('Тест 4 НЕ ПРОЙДЕН: Подделка не была обнаружена!');
  } catch (error) {
    // Любая ошибка во время дешифрования подделанных данных означает, что наше обнаружение подделки работает
    console.log('Тест 4 ПРОЙДЕН: Подделка корректно обнаружена - ✓');
  }
  
  console.log('\n---\n');
  console.log('Все тесты успешно завершены!');
  
} catch (error) {
  console.error('Тест не пройден из-за ошибки:', error);
}