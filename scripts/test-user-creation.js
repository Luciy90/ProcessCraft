#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Функция для создания файла доступа к модулям для пользователя
function createAccessToModulesFile(username) {
  try {
    const usersDir = path.join(__dirname, '..', 'Server', 'users');
    const userDir = path.join(usersDir, username);
    const accessFile = path.join(userDir, 'accessToModules.json');
    
    // Создаем директорию пользователя если её нет
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Получаем список модулей из index.json
    const modulesIndexPath = path.join(__dirname, '..', 'src', 'renderer', 'js', 'modules', 'index.json');
    let moduleIds = [];
    
    if (fs.existsSync(modulesIndexPath)) {
      try {
        const modulesData = JSON.parse(fs.readFileSync(modulesIndexPath, 'utf-8'));
        moduleIds = modulesData.modules.map(modulePath => {
          // Извлекаем moduleId из пути к модулю
          const parts = modulePath.split('/');
          return parts.length > 1 ? parts[0] : modulePath.replace('.js', '');
        });
      } catch (error) {
        console.warn('Ошибка чтения modules/index.json:', error);
      }
    }
    
    // Создаем объект доступа с параметрами по умолчанию для каждого модуля
    const accessData = {};
    for (const moduleId of moduleIds) {
      accessData[moduleId] = {
        visible: false,
        lock: true
      };
    }
    
    // Записываем файл доступа
    fs.writeFileSync(accessFile, JSON.stringify(accessData, null, 2), 'utf-8');
    console.log(`Файл доступа к модулям создан для пользователя: ${username}`);
    console.log('Созданные модули:', Object.keys(accessData));
  } catch (error) {
    console.error(`Ошибка создания файла доступа к модулям для пользователя ${username}:`, error);
  }
}

// Тестируем создание файла доступа для нового пользователя
const testUsername = 'testUser';
createAccessToModulesFile(testUsername);

// Проверяем, что файл был создан
const usersDir = path.join(__dirname, '..', 'Server', 'users');
const userDir = path.join(usersDir, testUsername);
const accessFile = path.join(userDir, 'accessToModules.json');

if (fs.existsSync(accessFile)) {
  console.log('Файл доступа успешно создан!');
  const accessData = JSON.parse(fs.readFileSync(accessFile, 'utf-8'));
  console.log('Содержимое файла доступа:');
  console.log(JSON.stringify(accessData, null, 2));
} else {
  console.log('Файл доступа не был создан');
}