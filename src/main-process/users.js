const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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
    return JSON.parse(raw);
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
  const dir = getUserDir(username);
  if (!fs.existsSync(dir)) return;
  const defaults = {
    visits: { total: 0, last: null, history: [] },
    tasks: { current: [], backlog: [] },
    activity: { items: [] }
  };
  for (const section of Object.keys(defaults)) {
    const file = getUserSectionFile(username, section);
    if (!fs.existsSync(file)) writeJsonSafe(file, defaults[section]);
  }
}

// Функция для создания файла доступа к модулям для пользователя
async function createAccessToModulesFile(username) {
  try {
    const userDir = getUserDir(username);
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

// Регистрация IPC обработчиков для работы с пользователями
function registerUserHandlers() {
  // Список пользователей
  ipcMain.handle('users:list', async () => {
    ensureUsersDir();
    try {
      const entries = fs.readdirSync(usersRootDir, { withFileTypes: true });
      const users = entries
        .filter((e) => e.isDirectory())
        .map((e) => {
          ensureUserSectionFiles(e.name);
          const data = readJsonSafe(path.join(usersRootDir, e.name, 'user.json')) || {};
          return {
            username: e.name,
            displayName: data.displayName || e.name,
            role: data.role || 'User',
            avatarPath: data.avatarPath || null
          };
        });
      return { ok: true, users };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Получить пользователя
  ipcMain.handle('users:get', async (event, username) => {
    if (!username) return { ok: false, error: 'username required' };
    const data = readJsonSafe(getUserFile(username));
    if (!data) return { ok: false, error: 'not_found' };
    ensureUserSectionFiles(username);
    return { ok: true, user: data };
  });

  // Универсальные методы получения/сохранения для разделов
  ipcMain.handle('users:getSection', async (event, payload) => {
    try {
      const { username, section } = payload || {};
      if (!username || !section) return { ok: false, error: 'username_section_required' };
      ensureUserSectionFiles(username);
      const data = readJsonSafe(getUserSectionFile(username, section));
      return { ok: true, data: data ?? null };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('users:saveSection', async (event, payload) => {
    try {
      const { username, section, data } = payload || {};
      if (!username || !section) return { ok: false, error: 'username_section_required' };
      ensureUserSectionFiles(username);
      writeJsonSafe(getUserSectionFile(username, section), data || {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Получить профиль пользователя
  ipcMain.handle('users:getProfile', async (event, username) => {
    if (!username) return { ok: false, error: 'username required' };
    const data = readJsonSafe(getUserProfileFile(username)) || { activity: [], stats: {} };
    return { ok: true, profile: data };
  });

  // Сохранить профиль пользователя
  ipcMain.handle('users:saveProfile', async (event, payload) => {
    try {
      const { username, profile } = payload || {};
      if (!username) return { ok: false, error: 'username_required' };
      writeJsonSafe(getUserProfileFile(username), profile || {});
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Создать пользователя
  ipcMain.handle('users:create', async (event, payload) => {
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
      fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
      writeJsonSafe(getUserFile(username), userData);
      ensureUserSectionFiles(username);
      
      // Создаем файл доступа к модулям для нового пользователя
      await createAccessToModulesFile(username);
      
      return { ok: true, user: userData };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Сохранить/обновить пользователя
  ipcMain.handle('users:save', async (event, payload) => {
    try {
      const { username, updates } = payload || {};
      if (!username) return { ok: false, error: 'username_required' };
      const current = readJsonSafe(getUserFile(username));
      if (!current) return { ok: false, error: 'not_found' };
      const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
      writeJsonSafe(getUserFile(username), next);
      return { ok: true, user: next };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Удалить пользователя (только для SuperAdmin - проверка на стороне UI)
  ipcMain.handle('users:delete', async (event, username) => {
    try {
      if (!username) return { ok: false, error: 'username_required' };
      const dir = getUserDir(username);
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
        rimraf(dir);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
}

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