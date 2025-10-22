/**
 * Script to fix user role display issue
 * This script will clear the localStorage and force a fresh login
 * to ensure the correct role is displayed in the interface
 */

const fs = require('fs');
const path = require('path');

// Path to localStorage simulation (if it exists)
const localStoragePath = path.join(__dirname, '..', 'localStorage.json');

// Session key used in userStore.js
const SESSION_KEY = 'pc_current_user';

console.log('Исправление проблемы с отображением роли пользователя...');

try {
  // 1. Clear localStorage simulation file if it exists
  if (fs.existsSync(localStoragePath)) {
    fs.unlinkSync(localStoragePath);
    console.log('✓ Файл localStorage.json удален');
  }
  
  // 2. Clear user session data from Server/users directory
  const sessionFiles = [
    path.join(__dirname, '..', 'Server', 'users', 'Admin', 'user.json')
  ];
  
  for (const file of sessionFiles) {
    if (fs.existsSync(file)) {
      try {
        const userData = JSON.parse(fs.readFileSync(file, 'utf8'));
        // Update the role to ensure it's correct
        if (userData.role !== 'SuperAdmin') {
          userData.role = 'SuperAdmin';
          fs.writeFileSync(file, JSON.stringify(userData, null, 2), 'utf8');
          console.log(`✓ Роль в файле ${file} обновлена на SuperAdmin`);
        } else {
          console.log(`✓ Роль в файле ${file} уже корректна`);
        }
      } catch (error) {
        console.warn(`⚠ Ошибка при обновлении файла ${file}:`, error.message);
      }
    }
  }
  
  console.log('\nГотово! Теперь выполните следующие шаги:');
  console.log('1. Перезапустите приложение ProcessCraft');
  console.log('2. Войдите в систему заново под пользователем Admin');
  console.log('3. Проверьте, что роль теперь отображается как "SuperAdmin"');
  
} catch (error) {
  console.error('Ошибка при исправлении проблемы:', error.message);
}