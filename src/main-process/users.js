const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Импортируем функции для работы с SQL Server
const { 
  getUserByUsername, 
  getAllActiveUsers, 
  getInactiveUsers 
} = require('../db/request/auth-choice');
const { 
  createNewUser, 
  updateUserPassword,
  updateLastLogin
} = require('../db/request/auth-process');
const { getConnectionPool } = require('../db/connection');
const { hasRole } = require('./access'); // Импортируем функцию проверки ролей

// Базовый путь для серверных данных внутри проекта
const serverRootPath = path.join(__dirname, '../../Server');
const usersRootDir = path.join(serverRootPath, 'users');

function ensureUsersDir() {
  try {
    // Создаем базовую папку Server и подпапку users
    if (!fs.existsSync(serverRootPath)) fs.mkdirSync(serverRootPath, { recursive: true });
    if (!fs.existsSync(usersRootDir)) fs.mkdirSync(usersRootDir, { recursive: true });
  } catch (e) {
    console.error('Не удалось создать папку пользователей:', e);
  }
}

function getUserDir(username) {
  return path.join(usersRootDir, username);
}

function getUserFile(username) {
  return path.join(getUserDir(username), 'user.json');
}

// Вспомогательные файлы разделов (JSON-файлы для каждого пользователя)
function getUserSectionFile(username, section) {
  return path.join(getUserDir(username), `${section}.json`);
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse?.(raw);
  } catch (e) {
    console.error('Ошибка чтения JSON:', filePath, e);
    return null;
  }
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

// Обеспечить существование файлов разделов для каждого пользователя
function ensureUserSectionFiles(username) {
  const dir = getUserDir?.(username);
  if (!fs.existsSync(dir)) return;
  const defaults = {
    visits: { total: 0, last: null, history: [] },
    tasks: { current: [], backlog: [] },
    activity: { items: [] }
  };
  for (const section of Object.keys?.(defaults)) {
    const file = getUserSectionFile?.(username, section);
    if (!fs.existsSync(file)) writeJsonSafe(file, defaults[section]);
  }
}

// Функция для создания файла доступа к модулям для пользователя
async function createAccessToModulesFile(username) {
  try {
    const userDir = getUserDir?.(username);
    const accessFile = path.join(userDir, 'accessToModules.json');
    
    // Создаем директорию пользователя если её нет
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Получаем список модулей из index.json
    const modulesIndexPath = path.join(__dirname, '../renderer/js/modules/index.json');
    let moduleIds = [];
    
    if (fs.existsSync(modulesIndexPath)) {
      try {
        const modulesData = JSON.parse(fs.readFileSync(modulesIndexPath, 'utf-8'));
        moduleIds = modulesData.modules?.map?.(modulePath => {
          // Извлекаем moduleId из пути к модулю
          const parts = modulePath.split?.('/');
          return parts.length > 1 ? parts?.[0] : modulePath.replace?.('.js', '');
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

// Вспомогательная функция для определения пути к обложке с резервным вариантом
function resolveCoverPath(username) {
  const userAssetsDir = path.join(__dirname, '../../Server/users', username, 'assets');
  const coverExtensions = ['jpg', 'jpeg', 'png'];
  
  // Проверка наличия пользовательских изображений обложки
  for (const ext of coverExtensions) {
    const coverPath = path.join(userAssetsDir, `cover.${ext}`);
    if (fs.existsSync(coverPath)) {
      return coverPath;
    }
  }
  
  // Возвращаем null, если пользовательская обложка не найдена (будет использован вариант по умолчанию в рендерере)
  return null;
}

// Дополнительные файлы профиля
function getUserProfileFile(username) {
  return path.join(getUserDir(username), 'profile.json');
}

// Функция для обновления профиля пользователя в базе данных
async function updateUserProfile(username, updates) {
  try {
    // Получаем пул подключений суперадминистратора для привилегированной операции
    const pool = await getConnectionPool?.('superadmin');
    
    // Формируем запрос на обновление в зависимости от переданных данных
    const fields = [];
    const values = [];
    
    if (updates.displayName !== undefined) {
      fields.push?.('DisplayName = @displayName');
      values.push?.({ name: 'displayName', type: 'NVarChar', value: updates.displayName, size: 100 });
    }
    
    if (updates.email !== undefined) {
      fields.push?.('Email = @email');
      values.push?.({ name: 'email', type: 'VarChar', value: updates.email, size: 100 });
    }
    
    if (updates.phone !== undefined) {
      fields.push?.('Phone = @phone');
      values.push?.({ name: 'phone', type: 'VarChar', value: updates.phone, size: 20 });
    }
    
    if (updates.department !== undefined) {
      fields.push?.('Department = @department');
      values.push?.({ name: 'department', type: 'NVarChar', value: updates.department, size: 100 });
    }
    
    if (updates.position !== undefined) {
      fields.push?.('Position = @position');
      values.push?.({ name: 'position', type: 'NVarChar', value: updates.position, size: 100 });
    }
    
    if (updates.avatarPath !== undefined) {
      fields.push?.('AvatarPath = @avatarPath');
      values.push?.({ name: 'avatarPath', type: 'VarChar', value: updates.avatarPath, size: 255 });
    }
    
    if (updates.coverPath !== undefined) {
      fields.push?.('CoverPath = @coverPath');
      values.push?.({ name: 'coverPath', type: 'VarChar', value: updates.coverPath, size: 255 });
    }
    
    if (updates.avatarColor !== undefined) {
      fields.push?.('AvatarColorHue = @avatarColorHue');
      values.push?.({ name: 'avatarColorHue', type: 'Int', value: updates.avatarColor.hue });
      
      fields.push?.('AvatarColorSaturation = @avatarColorSaturation');
      values.push?.({ name: 'avatarColorSaturation', type: 'Int', value: updates.avatarColor.saturation });
      
      fields.push?.('AvatarColorBrightness = @avatarColorBrightness');
      values.push?.({ name: 'avatarColorBrightness', type: 'Int', value: updates.avatarColor.brightness });
    }
    
    // Если нет полей для обновления, возвращаем успех
    if (fields.length === 0) {
      return { ok: true };
    }
    
    // Добавляем обновление времени
    fields.push?.('UpdatedAt = GETDATE()');
    
    // Формируем SQL запрос
    const query = `
      UPDATE Users 
      SET ${fields.join?.(', ')}
      WHERE UserName = @username
    `;
    
    // Добавляем имя пользователя к параметрам
    values.push?.({ name: 'username', type: 'VarChar', value: username, size: 50 });
    
    // Выполняем запрос
    const request = pool.request?.();
    values.forEach?.(param => {
      if (param.type === 'NVarChar') {
        request.input?.(param.name, sql[param.type]?.(param.size), param.value);
      } else if (param.type === 'VarChar') {
        request.input?.(param.name, sql[param.type]?.(param.size), param.value);
      } else {
        request.input?.(param.name, sql[param.type], param.value);
      }
    });
    
    await request.query?.(query);
    
    return { ok: true };
  } catch (error) {
    console.error('Ошибка обновления профиля пользователя:', error);
    return { ok: false, error: String(error) };
  }
}

// Функция для мягкого удаления пользователя (установка IsActive = 0)
async function deactivateUser(username) {
  try {
    // Получаем пул подключений суперадминистратора для привилегированной операции
    const pool = await getConnectionPool?.('superadmin');
    
    // Обновляем флаг IsActive на 0
    await pool.request?.()
      .input?.('username', sql.VarChar(50), username)
      .query?.(`
        UPDATE Users 
        SET IsActive = 0, UpdatedAt = GETDATE()
        WHERE UserName = @username
      `);
    
    return { ok: true };
  } catch (error) {
    console.error('Ошибка деактивации пользователя:', error);
    return { ok: false, error: String(error) };
  }
}

// Регистрация IPC обработчиков для работы с пользователями
function registerUserHandlers() {
  // Список пользователей
  ipcMain.handle('users:list', async () => {
    ensureUsersDir?.();
    try {
      // Получаем всех активных пользователей из базы данных
      const usersData = await getAllActiveUsers?.('regular');
      
      const users = usersData?.map?.(user => ({
        username: user.username,
        displayName: user.displayName,
        role: user.isSuperAdmin ? 'SuperAdmin' : 'User',
        avatarPath: user.avatarPath
      }));
      
      return { ok: true, users };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Получить пользователя
  ipcMain.handle('users:get', async (event, username) => {
    if (!username) return { ok: false, error: 'username required' };
    
    try {
      const userData = await getUserByUsername?.(username, 'regular');
      if (!userData) return { ok: false, error: 'not_found' };
      
      // Ensure user section files exist
      ensureUserSectionFiles?.(username);
      
      return { 
        ok: true, 
        user: {
          username: userData.username,
          displayName: userData.displayName,
          role: userData.isSuperAdmin ? 'SuperAdmin' : 'User',
          email: userData.email,
          phone: userData.phone,
          department: userData.department,
          position: userData.position,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          avatarPath: userData.avatarPath,
          coverPath: userData.coverPath,
          avatarColor: userData.avatarColor,
          stats: {},
          isSuperAdmin: userData.isSuperAdmin, // Передаем флаг IsSuperAdmin
          roles: userData.roles // Передаем массив ролей
        }
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Универсальные методы получения/сохранения для разделов
  ipcMain.handle('users:getSection', async (event, payload) => {
    try {
      const { username, section } = payload ?? {};
      if (!username || !section) return { ok: false, error: 'username_section_required' };
      ensureUserSectionFiles?.(username);
      const data = readJsonSafe?.(getUserSectionFile?.(username, section));
      return { ok: true, data: data ?? null };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('users:saveSection', async (event, payload) => {
    try {
      const { username, section, data } = payload ?? {};
      if (!username || !section) return { ok: false, error: 'username_section_required' };
      ensureUserSectionFiles?.(username);
      writeJsonSafe?.(getUserSectionFile?.(username, section), data || {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Получить профиль пользователя
  ipcMain.handle('users:getProfile', async (event, username) => {
    if (!username) return { ok: false, error: 'username required' };
    const data = readJsonSafe?.(getUserProfileFile?.(username)) || { activity: [], stats: {} };
    return { ok: true, profile: data };
  });

  // Сохранить профиль пользователя
  ipcMain.handle('users:saveProfile', async (event, payload) => {
    try {
      const { username, profile } = payload ?? {};
      if (!username) return { ok: false, error: 'username_required' };
      writeJsonSafe?.(getUserProfileFile?.(username), profile || {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Создать пользователя
  ipcMain.handle('users:create', async (event, payload) => {
    try {
      const { username, password, displayName, role, email, phone, department, position, currentUser } = payload ?? {};
      if (!username || !password) return { ok: false, error: 'username_password_required' };
      
      // Проверяем права текущего пользователя на создание пользователей
      if (!currentUser || !hasRole?.(currentUser, 'Admin')) {
        return { ok: false, error: 'insufficient_permissions' };
      }
      
      // Check if user already exists
      const existingUser = await getUserByUsername?.(username, 'superadmin');
      if (existingUser) return { ok: false, error: 'user_exists' };
      
      // Create user data object
      const userData = {
        username,
        password,
        displayName: displayName || username,
        email: email || '',
        phone: phone || '',
        department: department || '',
        position: position || '',
        isSuperAdmin: role === 'SuperAdmin'
      };
      
      // Create new user in database
      const success = await createNewUser?.(userData);
      if (!success) return { ok: false, error: 'creation_failed' };
      
      // Create user directory and files
      const dir = getUserDir?.(username);
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
      
      // Create access to modules file
      await createAccessToModulesFile?.(username);
      
      // Get created user data
      const createdUser = await getUserByUsername?.(username, 'superadmin');
      
      return { 
        ok: true, 
        user: {
          username: createdUser.username,
          displayName: createdUser.displayName,
          role: createdUser.isSuperAdmin ? 'SuperAdmin' : 'User',
          email: createdUser.email,
          phone: createdUser.phone,
          department: createdUser.department,
          position: createdUser.position,
          createdAt: createdUser.createdAt,
          lastLoginAt: createdUser.lastLoginAt,
          avatarPath: createdUser.avatarPath,
          coverPath: createdUser.coverPath,
          avatarColor: createdUser.avatarColor,
          stats: {},
          isSuperAdmin: createdUser.isSuperAdmin, // Передаем флаг IsSuperAdmin
          roles: createdUser.roles // Передаем массив ролей
        }
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Сохранить/обновить пользователя
  ipcMain.handle('users:save', async (event, payload) => {
    try {
      const { username, updates, currentUser } = payload ?? {};
      if (!username) return { ok: false, error: 'username_required' };
      
      // Проверяем права текущего пользователя на редактирование пользователей
      if (!currentUser || !hasRole?.(currentUser, 'Admin')) {
        return { ok: false, error: 'insufficient_permissions' };
      }
      
      // Update user profile in database
      const result = await updateUserProfile?.(username, updates);
      if (!result.ok) return result;
      
      // Also update JSON files for backward compatibility
      const current = readJsonSafe?.(getUserFile?.(username));
      if (!current) return { ok: false, error: 'not_found' };
      const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
      writeJsonSafe?.(getUserFile?.(username), next);
      return { ok: true, user: next };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Удалить пользователя (только для SuperAdmin - проверка на стороне UI)
  ipcMain.handle('users:delete', async (event, payload) => {
    try {
      const { username, currentUser } = payload ?? {};
      if (!username) return { ok: false, error: 'username_required' };
      
      // Проверяем права текущего пользователя на удаление пользователей
      if (!currentUser || !hasRole?.(currentUser, 'Admin')) {
        return { ok: false, error: 'insufficient_permissions' };
      }
      
      // Деактивируем пользователя в базе данных (мягкое удаление)
      const result = await deactivateUser?.(username);
      if (!result.ok) return result;
      
      // Также удаляем директорию пользователя для обратной совместимости
      const dir = getUserDir?.(username);
      if (!fs.existsSync(dir)) return { ok: false, error: 'not_found' };
      
      // рекурсивное удаление директории пользователя
      if (fs.rmSync) {
        fs.rmSync(dir, { recursive: true, force: true });
      } else {
        // fallback
        const rimraf = (p) => {
          if (fs.existsSync(p)) {
            for (const entry of fs.readdirSync(p)) {
              const cur = path.join(p, entry);
              if (fs.lstatSync(cur).isDirectory()) rimraf(cur); else fs.unlinkSync(cur);
            }
            fs.rmdirSync(p);
          }
        };
        rimraf?.(dir);
      }
      
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
}

// Добавляем импорт sql
const sql = require('mssql');

module.exports = {
  ensureUsersDir,
  getUserDir,
  getUserFile,
  readJsonSafe,
  writeJsonSafe,
  ensureUserSectionFiles,
  createAccessToModulesFile,
  resolveCoverPath,
  getUserProfileFile,
  registerUserHandlers
}; 