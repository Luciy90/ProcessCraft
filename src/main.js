const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Глобальная ссылка на окно приложения
let mainWindow;

// Конфигурация приложения
const isDev = process.argv.includes('--dev');

function createWindow() {
  // Создание окна браузера
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'ProcessCraft - Управление производством',
    show: false
  });

  // Загрузка главной страницы
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Показать окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Открыть DevTools в режиме разработки
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Создание меню приложения
function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новый заказ',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-order');
          }
        },
        {
          label: 'Открыть...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open');
          }
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О приложении',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'О ProcessCraft',
              message: 'ProcessCraft v1.0.0',
              detail: 'Приложение для управления производством\n\nВерсия: 1.0.0\nАвтор: ProcessCraft Team'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Инициализация приложения
app.whenReady().then(() => {
  // При старте в Electron — обновим modules/index.json автоматически
  try {
    const child = require('child_process');
    const scriptsPath = path.join(__dirname, '..', 'scripts', 'build-modules-index.js');
    if (fs.existsSync(scriptsPath)) {
      // Выполняем синхронно, чтобы индекс был готов до загрузки renderer
      try {
        child.execFileSync(process.execPath, [scriptsPath], { stdio: 'inherit' });
        console.log('modules/index.json успешно перестроен');
      } catch (e) {
        console.warn('Failed to rebuild modules/index.json (continuing):', e.message);
      }
    }
  } catch (e) {
    console.warn('Rebuild modules step skipped:', e.message);
  }

  createWindow();
  createMenu();
  // Создаем дефолтного администратора, если его еще нет
  try {
    ensureUsersDir();
    const adminDir = getUserDir('Admin');
    const adminFile = getUserFile('Admin');
    if (!fs.existsSync(adminFile)) {
      const userData = {
        username: 'Admin',
        password: '1111', // ПРИМЕЧАНИЕ: минимальная версия продукта, заменить на хэш позже
        displayName: 'Администратор',
        role: 'SuperAdmin',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        avatarPath: null,
        stats: {}
      };
      fs.mkdirSync(adminDir, { recursive: true });
      fs.mkdirSync(path.join(adminDir, 'assets'), { recursive: true });
      writeJsonSafe(adminFile, userData);
      console.log('Создан дефолтный пользователь Admin');
    }
  } catch (e) {
    console.error('Не удалось создать дефолтного пользователя Admin:', e);
  }

  // Обработка активации приложения на macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Закрытие приложения когда все окна закрыты
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC обработчики для взаимодействия с рендерером
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Базовый путь для серверных данных внутри проекта
const serverRootPath = path.join(__dirname, '..', 'Server');

ipcMain.handle('get-app-path', () => {
  // Возвращаем путь к локальной папке Server внутри проекта
  return serverRootPath;
});

// Путь к шаблонам
// Диалог открытия файла по запросу из рендерера (без remote)
ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  return result.filePaths && result.filePaths.length ? result.filePaths[0] : null;
});

// Экспорт для использования в других модулях
module.exports = { mainWindow };

// =========================
// Пользователи (IPC + FS)
// =========================

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

ensureUsersDir();
// Обеспечить существование файлов разделов для каждого пользователя
function ensureUserSectionFiles(username) {
  const dir = getUserDir(username);
  if (!fs.existsSync(dir)) return;
  const defaults = {
    info: { phone: '', email: '', department: '', position: '' },
    visits: { total: 0, last: null, history: [] },
    tasks: { current: [], backlog: [] },
    activity: { items: [] }
  };
  for (const section of Object.keys(defaults)) {
    const file = getUserSectionFile(username, section);
    if (!fs.existsSync(file)) writeJsonSafe(file, defaults[section]);
  }
}

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

// Дополнительные файлы профиля
function getUserProfileFile(username) {
  return path.join(getUserDir(username), 'profile.json');
}

ipcMain.handle('users:getProfile', async (event, username) => {
  if (!username) return { ok: false, error: 'username required' };
  const data = readJsonSafe(getUserProfileFile(username)) || { activity: [], stats: {} };
  return { ok: true, profile: data };
});

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
    const { username, password, displayName, role } = payload || {};
    if (!username || !password) return { ok: false, error: 'username_password_required' };
    const dir = getUserDir(username);
    if (fs.existsSync(dir)) return { ok: false, error: 'user_exists' };
    const userData = {
      username,
      password, // ПРИМЕЧАНИЕ: для минимальной версии продукта хранение в открытом виде. Заменить на хэш позже.
      displayName: displayName || username,
      role: role || 'User',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      avatarPath: null,
      stats: {}
    };
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
    writeJsonSafe(getUserFile(username), userData);
    ensureUserSectionFiles(username);
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

// Helper function to resolve cover path with fallback
// Вспомогательная функция для определения пути к обложке с резервным вариантом
function resolveCoverPath(username) {
  const userAssetsDir = path.join(__dirname, '../Server/users', username, 'assets');
  const coverExtensions = ['jpg', 'jpeg', 'png'];
  
  // Check for user-specific cover images
  // Проверка наличия пользовательских изображений обложки
  for (const ext of coverExtensions) {
    const coverPath = path.join(userAssetsDir, `cover.${ext}`);
    if (fs.existsSync(coverPath)) {
      return coverPath;
    }
  }
  
  // Return null if no user-specific cover found (will fallback to default in renderer)
  // Возвращаем null, если пользовательская обложка не найдена (будет использован вариант по умолчанию в рендерере)
  return null;
}

// Логин
ipcMain.handle('auth:login', async (event, credentials) => {
  try {
    const { username, password } = credentials || {};
    if (!username || !password) return { ok: false, error: 'credentials_required' };
    const data = readJsonSafe(getUserFile(username));
    if (!data) return { ok: false, error: 'not_found' };
    if (data.password !== password) return { ok: false, error: 'invalid_password' };
    
    // Update last login time
    // Обновление времени последнего входа
    data.lastLoginAt = new Date().toISOString();
    writeJsonSafe(getUserFile(username), data);
    
    // Resolve cover path with fallback logic
    // Определение пути к обложке с резервной логикой
    let coverPath = data.coverPath;
    if (!coverPath || !fs.existsSync(coverPath)) {
      coverPath = resolveCoverPath(username);
      // Update user data with resolved cover path if found
      // Обновление данных пользователя с найденным путем к обложке
      if (coverPath && coverPath !== data.coverPath) {
        data.coverPath = coverPath;
        writeJsonSafe(getUserFile(username), data);
      }
    }
    
    return { 
      ok: true, 
      user: { 
        username: data.username, 
        displayName: data.displayName, 
        role: data.role, 
        avatarPath: data.avatarPath, 
        coverPath: coverPath, 
        lastLoginAt: data.lastLoginAt 
      } 
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// Заглушки для текущей сессии на уровне main (сохраняем в renderer через localStorage)
ipcMain.handle('auth:logout', async () => ({ ok: true }));

// Check if file exists
// Проверка существования файла
ipcMain.handle('file:exists', async (event, filePath) => {
  try {
    if (!filePath) return { exists: false };
    const exists = fs.existsSync(filePath);
    return { exists };
  } catch (error) {
    console.error('Error checking file existence:', error);
    return { exists: false };
  }
});

// File upload handlers
// Обработчики загрузки файлов
ipcMain.handle('upload:cover', async (event, { username, fileData, fileName }) => {
  try {
    // Validate file type
    // Проверка типа файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(fileData.type)) {
      return {
        status: 'error',
        error_code: 'invalid_file_type',
        message: 'Поддерживаются только файлы JPEG и PNG'
      };
    }

    // Create user assets directory if it doesn't exist
    // Создание директории для пользовательских ресурсов, если она не существует
    const userAssetsDir = path.join(__dirname, '../Server/users', username, 'assets');
    if (!fs.existsSync(userAssetsDir)) {
      try {
        fs.mkdirSync(userAssetsDir, { recursive: true });
      } catch (err) {
        return {
          status: 'error',
          error_code: 'folder_creation_failed',
          message: 'Не удалось создать папку для изображений пользователя'
        };
      }
    }

    // Determine extension from MIME type
    // Определение расширения по MIME-типу
    let extension = 'jpg';
    if (fileData.type === 'image/png') {
      extension = 'png';
    } else if (fileData.type === 'image/jpeg' || fileData.type === 'image/jpg') {
      extension = 'jpg';
    }

    // Remove old cover files with different extensions
    // Удаление старых файлов обложек с различными расширениями
    const oldFiles = ['cover.jpg', 'cover.jpeg', 'cover.png'];
    oldFiles.forEach(oldFile => {
      const oldFilePath = path.join(userAssetsDir, oldFile);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`Удален старый файл обложки: ${oldFile}`);
        } catch (err) {
          console.warn(`Failed to remove old cover file ${oldFile}:`, err);
        }
      }
    });

    // Create new filename with fixed name
    // Создание нового имени файла с фиксированным именем
    const newFileName = `cover.${extension}`;
    const filePath = path.join(userAssetsDir, newFileName);

    // Save file
    // Сохранение файла
    try {
      // Handle both base64 string and buffer data
      // Обработка как строки base64, так и буфера данных
      let buffer;
      if (typeof fileData.data === 'string') {
        // If it's a base64 string, convert to buffer
        // Если это строка base64, преобразуем в буфер
        buffer = Buffer.from(fileData.data, 'base64');
      } else if (Buffer.isBuffer(fileData.data)) {
        // If it's already a buffer, use it directly
        // Если это уже буфер, используем его напрямую
        buffer = fileData.data;
      } else {
        // If it's an array or other format, try to convert
        // Если это массив или другой формат, пытаемся преобразовать
        buffer = Buffer.from(fileData.data);
      }
      
      fs.writeFileSync(filePath, buffer);
    } catch (err) {
      console.error('File save error:', err);
      return {
        status: 'error',
        error_code: 'save_failed',
        message: 'Не удалось сохранить файл'
      };
    }

    // Update user.json with new cover path
    // Обновление user.json с новым путем к обложке
    try {
      const userJsonPath = path.join(__dirname, '../Server/users', username, 'user.json');
      if (fs.existsSync(userJsonPath)) {
        const userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
        userData.coverPath = filePath;
        userData.updatedAt = new Date().toISOString();
        fs.writeFileSync(userJsonPath, JSON.stringify(userData, null, 2));
      }
    } catch (err) {
      console.warn('Failed to update user.json with cover path:', err);
      // Continue anyway as file was saved successfully
      // Продолжаем, так как файл был успешно сохранен
    }

    return {
      status: 'success',
      type: 'cover',
      file_path: filePath
    };
  } catch (err) {
    console.error('Cover upload error:', err);
    return {
      status: 'error',
      error_code: 'unknown_error',
      message: 'Произошла неизвестная ошибка при загрузке файла'
    };
  }
});

ipcMain.handle('upload:avatar', async (event, { username, fileData, fileName }) => {
  try {
    // Validate file type
    // Проверка типа файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(fileData.type)) {
      return {
        status: 'error',
        error_code: 'invalid_file_type',
        message: 'Поддерживаются только файлы JPEG и PNG'
      };
    }

    // Create user assets directory if it doesn't exist
    // Создание директории для пользовательских ресурсов, если она не существует
    const userAssetsDir = path.join(__dirname, '../Server/users', username, 'assets');
    if (!fs.existsSync(userAssetsDir)) {
      try {
        fs.mkdirSync(userAssetsDir, { recursive: true });
      } catch (err) {
        return {
          status: 'error',
          error_code: 'folder_creation_failed',
          message: 'Не удалось создать папку для аватара пользователя'
        };
      }
    }

    // Determine extension from MIME type
    // Определение расширения по MIME-типу
    let extension = 'jpg';
    if (fileData.type === 'image/png') {
      extension = 'png';
    } else if (fileData.type === 'image/jpeg' || fileData.type === 'image/jpg') {
      extension = 'jpg';
    }

    // Remove old avatar files with different extensions
    // Удаление старых файлов аватаров с различными расширениями
    const oldFiles = ['avatar.jpg', 'avatar.jpeg', 'avatar.png'];
    oldFiles.forEach(oldFile => {
      const oldFilePath = path.join(userAssetsDir, oldFile);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`Удален старый файл аватара: ${oldFile}`);
        } catch (err) {
          console.warn(`Failed to remove old avatar file ${oldFile}:`, err);
        }
      }
    });

    // Create new filename with fixed name
    // Создание нового имени файла с фиксированным именем
    const newFileName = `avatar.${extension}`;
    const filePath = path.join(userAssetsDir, newFileName);

    // Save file
    // Сохранение файла
    try {
      // Handle both base64 string and buffer data
      // Обработка как строки base64, так и буфера данных
      let buffer;
      if (typeof fileData.data === 'string') {
        // If it's a base64 string, convert to buffer
        // Если это строка base64, преобразуем в буфер
        buffer = Buffer.from(fileData.data, 'base64');
      } else if (Buffer.isBuffer(fileData.data)) {
        // If it's already a buffer, use it directly
        // Если это уже буфер, используем его напрямую
        buffer = fileData.data;
      } else {
        // If it's an array or other format, try to convert
        // Если это массив или другой формат, пытаемся преобразовать
        buffer = Buffer.from(fileData.data);
      }
      
      fs.writeFileSync(filePath, buffer);
    } catch (err) {
      console.error('File save error:', err);
      return {
        status: 'error',
        error_code: 'save_failed',
        message: 'Не удалось сохранить файл аватара'
      };
    }

    // Update user.json with new avatar path
    // Обновление user.json с новым путем к аватару
    try {
      const userJsonPath = path.join(__dirname, '../Server/users', username, 'user.json');
      if (fs.existsSync(userJsonPath)) {
        const userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
        userData.avatarPath = filePath;
        userData.updatedAt = new Date().toISOString();
        fs.writeFileSync(userJsonPath, JSON.stringify(userData, null, 2));
      }
    } catch (err) {
      console.warn('Failed to update user.json:', err);
      // Continue anyway as file was saved successfully
      // Продолжаем, так как файл был успешно сохранен
    }

    return {
      status: 'success',
      type: 'avatar',
      file_path: filePath
    };
  } catch (err) {
    console.error('Avatar upload error:', err);
    return {
      status: 'error',
      error_code: 'unknown_error',
      message: 'Произошла неизвестная ошибка при загрузке аватара'
    };
  }
});

