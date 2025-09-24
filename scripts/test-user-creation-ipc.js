#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Имитация функций из main.js
const serverRootPath = path.join(__dirname, '..', 'Server');
const usersRootDir = path.join(serverRootPath, 'users');

function getUserDir(username) {
  return path.join(usersRootDir, username);
}

function getUserFile(username) {
  return path.join(getUserDir(username), 'user.json');
}

function writeJsonSafe(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Ошибка записи JSON:', filePath, e);
    return false;
  }
}

function ensureUserSectionFiles(username) {
  const dir = getUserDir(username);
  if (!fs.existsSync(dir)) return;
  const defaults = {
    visits: { total: 0, last: null, history: [] },
    tasks: { current: [], backlog: [] },
    activity: { items: [] }
  };
  for (const section of Object.keys(defaults)) {
    const file = path.join(dir, `${section}.json`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaults[section], null, 2), 'utf-8');
    }
  }
}

// Функция для создания файла доступа к модулям для пользователя (имитация из main.js)
async function createAccessToModulesFile(username) {
  try {
    const userDir = getUserDir(username);
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
  } catch (error) {
    console.error(`Ошибка создания файла доступа к модулям для пользователя ${username}:`, error);
  }
}

// Имитация обработчика IPC users:create
async function createUserHandler(payload) {
  try {
    const { username, password, displayName, role, email, phone, department, position } = payload || {};
    if (!username || !password) return { ok: false, error: 'username_password_required' };
    const dir = getUserDir(username);
    if (fs.existsSync(dir)) return { ok: false, error: 'user_exists' };
    const userData = {
      username,
      password, // ПРИМЕЧАНИЕ: для минимальной версии продукта хранение в открытом виде. Заменить на хэш позже.
      displayName: displayName || username,
      role: role || 'User',
      email: email || '',
      phone: phone || '',
      department: department || '',
      position: position || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      avatarPath: null,
      stats: {}
    };
    fs.mkdirSync(dir, { recursive: true });
    // fs.mkdirSync(path.join(dir, 'assets'), { recursive: true }); // Закомментировано для теста
    writeJsonSafe(getUserFile(username), userData);
    // ensureUserSectionFiles(username); // Закомментировано для теста
    
    // Создаем файл доступа к модулям для нового пользователя
    await createAccessToModulesFile(username);
    
    return { ok: true, user: userData };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Тестируем создание пользователя
async function testUserCreation() {
  const testUser = {
    username: 'testUserIPC',
    password: 'test123',
    displayName: 'Test User IPC',
    role: 'User',
    email: 'test@example.com',
    phone: '+1234567890',
    department: 'Testing',
    position: 'Tester'
  };

  console.log('Создание тестового пользователя...');
  const result = await createUserHandler(testUser);
  
  if (result.ok) {
    console.log('Пользователь успешно создан!');
    console.log('Данные пользователя:', JSON.stringify(result.user, null, 2));
    
    // Проверяем, что файл доступа к модулям был создан
    const userDir = getUserDir(testUser.username);
    const accessFile = path.join(userDir, 'accessToModules.json');
    
    if (fs.existsSync(accessFile)) {
      console.log('Файл доступа к модулям успешно создан!');
      const accessData = JSON.parse(fs.readFileSync(accessFile, 'utf-8'));
      console.log('Содержимое файла доступа:');
      console.log(JSON.stringify(accessData, null, 2));
    } else {
      console.log('Файл доступа к модулям не был создан');
    }
  } else {
    console.log('Ошибка создания пользователя:', result.error);
  }
  
  // Очищаем тестовые данные
  const testUserDir = getUserDir('testUserIPC');
  if (fs.existsSync(testUserDir)) {
    fs.rmSync(testUserDir, { recursive: true, force: true });
    console.log('Тестовый пользователь удален');
  }
}

// Запускаем тест
testUserCreation().catch(console.error);