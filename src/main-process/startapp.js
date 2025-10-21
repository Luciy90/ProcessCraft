const { app, BrowserWindow, Menu, dialog } = require('electron');
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
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'ProcessCraft - Управление производством',
    show: false
  });

  // Загрузка главной страницы
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Показать окно когда готово
  mainWindow.once?.('ready-to-show', () => {
    mainWindow.show?.();
    
    // Открыть DevTools в режиме разработки
    if (isDev) {
      mainWindow.webContents.openDevTools?.();
    }
  });

  // Обработка закрытия окна
  mainWindow.on?.('closed', () => {
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
            if (mainWindow) { mainWindow.webContents.send('menu-new-order'); }
          }
        },
        {
          label: 'Открыть...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) { mainWindow.webContents.send('menu-open'); }
          }
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit?.();
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
            dialog.showMessageBox?.(mainWindow, {
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
  Menu.setApplicationMenu?.(menu);
}

// Инициализация приложения
function initializeApp(updateAccessConfigWithMarkers, ensureUsersDir, getUserDir, getUserFile, writeJsonSafe) {
  // При старте в Electron — обновим modules/index.json автоматически
  try {
    const child = require('child_process');
    const scriptsPath = path.join(__dirname, '../../scripts/build-modules-index.js');
    if (fs.existsSync(scriptsPath)) {
      // Выполняем синхронно, чтобы индекс был готов до загрузки renderer
      try {
        child.execFileSync?.(process.execPath, [scriptsPath], { stdio: 'inherit' });
        console.log('modules/index.json успешно перестроен');
      } catch (e) {
        console.warn('Не удалось перестроить modules/index.json (продолжаем):', e.message);
      }
    }
  } catch (e) {
    console.warn('Этап перестроения модулей пропущен:', e.message);
  }

  createWindow();
  createMenu();
  
  // Создаем дефолтного администратора, если его еще нет
  try {
    ensureUsersDir?.();
    const adminDir = getUserDir?.('Admin');
    const adminFile = getUserFile?.('Admin');
    if (!fs.existsSync(adminFile)) {
      const userData = {
        username: 'Admin',
        password: '1111', // ПРИМЕЧАНИЕ: минимальная версия продукта, заменить на хэш позже
        displayName: 'Администратор',
        role: 'SuperAdmin',
        createdAt: new Date().toISOString?.(),
        lastLoginAt: null,
        avatarPath: null,
        stats: {}
      };
      fs.mkdirSync(adminDir, { recursive: true });
      fs.mkdirSync(path.join(adminDir, 'assets'), { recursive: true });
      writeJsonSafe?.(adminFile, userData);
      console.log('Создан дефолтный пользователь Admin');
    }
  } catch (e) {
    console.error('Не удалось создать дефолтного пользователя Admin:', e);
  }

  // Автообновление файла доступа при запуске приложения
  try {
    updateAccessConfigWithMarkers?.();
  } catch (e) {
    console.error('Не удалось обновить файл доступа:', e);
  }

  // Обработка активации приложения на macOS
  app.on?.('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// Закрытие приложения когда все окна закрыты
function handleAppQuit() {
  app.on?.('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit?.();
    }
  });
}

// Экспорт mainWindow для использования в других частях приложения
module.exports = {
  mainWindow,
  initializeApp,
  handleAppQuit
}; 