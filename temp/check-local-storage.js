// This script simulates checking localStorage in the renderer process
const fs = require('fs');
const path = require('path');

// Path to the user data file that would be used in localStorage
const userDataPath = path.join(__dirname, '..', 'Server', 'users', 'Admin', 'user.json');

try {
  if (fs.existsSync(userDataPath)) {
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    console.log('Данные пользователя из user.json:');
    console.log(JSON.stringify(userData, null, 2));
  } else {
    console.log('Файл user.json не найден по пути:', userDataPath);
  }
} catch (error) {
  console.error('Ошибка при чтении user.json:', error);
}

// Also check localStorage simulation
const localStoragePath = path.join(__dirname, '..', 'localStorage.json');

try {
  if (fs.existsSync(localStoragePath)) {
    const localStorageData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
    console.log('\nДанные из localStorage:');
    console.log(JSON.stringify(localStorageData, null, 2));
  } else {
    console.log('\nФайл localStorage.json не найден');
  }
} catch (error) {
  console.error('Ошибка при чтении localStorage:', error);
}