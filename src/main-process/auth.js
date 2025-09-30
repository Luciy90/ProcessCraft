const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Импортируем необходимые функции из users.js
const {
  getUserFile,
  readJsonSafe,
  writeJsonSafe,
  resolveCoverPath
} = require('./users');

// Заглушки для текущей сессии на уровне main (сохраняем в renderer через localStorage)
function registerAuthHandlers() {
  ipcMain.handle('auth:logout', async () => ({ ok: true }));

  // Логин
  ipcMain.handle('auth:login', async (event, credentials) => {
    try {
      const { username, password } = credentials || {};
      if (!username || !password) return { ok: false, error: 'credentials_required' };
      const data = readJsonSafe(getUserFile(username));
      if (!data) return { ok: false, error: 'not_found' };
      if (data.password !== password) return { ok: false, error: 'invalid_password' };
      
      // Обновление времени последнего входа
      data.lastLoginAt = new Date().toISOString();
      writeJsonSafe(getUserFile(username), data);
      
      // Определение пути к обложке с резервной логикой
      let coverPath = data.coverPath;
      if (!coverPath || !fs.existsSync(coverPath)) {
        coverPath = resolveCoverPath(username);
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
}

module.exports = { registerAuthHandlers };