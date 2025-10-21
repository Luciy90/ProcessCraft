const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Регистрация IPC обработчиков для работы с файлами
function registerFileHandlers(mainWindow) {
  // Проверка существования файла
  ipcMain.handle('file:exists', async (event, filePath) => {
    try {
      if (!filePath) return { exists: false };
      const exists = fs.existsSync(filePath);
      return { exists };
    } catch (error) {
      console.error('Ошибка проверки существования файла:', error);
      return { exists: false };
    }
  });

  // Диалог открытия файла по запросу из рендерера (без remote)
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog?.(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled) return null;
    return result.filePaths && result.filePaths.length ? result.filePaths?.[0] : null;
  });

  // IPC обработчики для взаимодействия с рендерером
  ipcMain.handle('get-app-version', () => {
    return require('electron').app.getVersion?.();
  });

  // Базовый путь для серверных данных внутри проекта
  const serverRootPath = path.join(__dirname, '../../Server');
  ipcMain.handle('get-app-path', () => {
    // Возвращаем путь к локальной папке Server внутри проекта
    return serverRootPath;
  });
}

module.exports = { registerFileHandlers }; 