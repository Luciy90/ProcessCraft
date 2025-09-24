#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Путь к директории пользователей
const usersDir = path.join(__dirname, '..', 'Server', 'users');

// Получаем список пользователей
const users = fs.readdirSync(usersDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log('Найдено пользователей:', users.length);

// Для каждого пользователя проверяем и обновляем файл доступа к модулям
users.forEach(username => {
  const userDir = path.join(usersDir, username);
  const accessFile = path.join(userDir, 'accessToModules.json');
  
  // Проверяем существование файла доступа
  if (fs.existsSync(accessFile)) {
    try {
      const accessData = JSON.parse(fs.readFileSync(accessFile, 'utf-8'));
      console.log(`Пользователь ${username}:`, Object.keys(accessData));
    } catch (error) {
      console.error(`Ошибка чтения файла доступа для ${username}:`, error.message);
    }
  } else {
    console.log(`Файл доступа для ${username} не найден`);
  }
});