#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Функция для получения moduleId из пути к модулю
function getModuleId(modulePath) {
  const parts = modulePath.split('/');
  return parts.length > 1 ? parts[0] : modulePath.replace('.js', '');
}

// Путь к index.json
const indexFile = path.join(__dirname, '..', 'src', 'renderer', 'js', 'modules', 'index.json');

// Читаем текущий index.json
const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
console.log('Текущие модули:', indexData.modules.map(getModuleId));

// Создаем копию для теста
const originalModules = [...indexData.modules];

// Удаляем один модуль (например, "production/production.js")
const moduleToRemove = "production/production.js";
const moduleIdToRemove = getModuleId(moduleToRemove);

indexData.modules = indexData.modules.filter(module => module !== moduleToRemove);

// Сохраняем измененный index.json
fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf-8');
console.log(`Модуль ${moduleIdToRemove} удален из index.json`);

// Путь к директории пользователей
const usersDir = path.join(__dirname, '..', 'Server', 'users');

// Получаем список пользователей
const users = fs.readdirSync(usersDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log('Проверка файлов доступа для пользователей...');

// Для каждого пользователя проверяем и обновляем файл доступа к модулям
let totalRemoved = 0;
users.forEach(username => {
  const userDir = path.join(usersDir, username);
  const accessFile = path.join(userDir, 'accessToModules.json');
  
  // Проверяем существование файла доступа
  if (fs.existsSync(accessFile)) {
    try {
      const accessData = JSON.parse(fs.readFileSync(accessFile, 'utf-8'));
      
      // Проверяем, есть ли модуль, который мы удалили
      if (accessData[moduleIdToRemove]) {
        // Удаляем модуль из файла доступа
        delete accessData[moduleIdToRemove];
        totalRemoved++;
        
        // Сохраняем обновленный файл доступа
        fs.writeFileSync(accessFile, JSON.stringify(accessData, null, 2), 'utf-8');
        console.log(`Для пользователя ${username} удален модуль ${moduleIdToRemove} из файла доступа`);
      } else {
        console.log(`Для пользователя ${username} модуль ${moduleIdToRemove} отсутствует в файле доступа`);
      }
    } catch (error) {
      console.error(`Ошибка обработки файла доступа для ${username}:`, error.message);
    }
  } else {
    console.log(`Файл доступа для ${username} не найден`);
  }
});

console.log(`Всего удалено модулей из файлов доступа: ${totalRemoved}`);

// Восстанавливаем оригинальный index.json
indexData.modules = originalModules;
fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf-8');
console.log('Оригинальный index.json восстановлен');