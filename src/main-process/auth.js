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

// Импортируем функции для работы с SQL Server
const { getUserByUsername } = require('../db/request/auth-choice');
const { verifyPassword, updateLastLogin } = require('../db/request/auth-process');

// Заглушки для текущей сессии на уровне main (сохраняем в renderer через localStorage)
function registerAuthHandlers() {
  ipcMain.handle('auth:logout', async () => ({ ok: true }));

  // Логин
  ipcMain.handle('auth:login', async (event, credentials) => {
    try {
      const { username, password } = credentials ?? {};
      if (!username || !password) return { ok: false, error: 'credentials_required' };
      
      // Получаем пользователя из базы данных с ролями
      const userData = await getUserByUsername?.(username, 'regular');
      if (!userData) return { ok: false, error: 'not_found' };
      
      // Проверяем пароль
      const isValid = verifyPassword?.(password, userData.passwordHash);
      if (!isValid) return { ok: false, error: 'invalid_password' };
      
      // Обновление времени последнего входа
      await updateLastLogin?.(username);
      
      // Определение пути к обложке с резервной логикой
      let coverPath = userData.coverPath;
      if (!coverPath || !fs.existsSync(coverPath)) {
        coverPath = resolveCoverPath?.(username);
      }
      
      // Определяем основную роль пользователя
      // Если пользователь имеет флаг isSuperAdmin, то его роль - SuperAdmin
      // В противном случае используем первую роль из массива roles или 'User' по умолчанию
      let userRole = 'User';
      if (userData.isSuperAdmin) {
        userRole = 'SuperAdmin';
      } else if (userData.roles && userData.roles.length > 0) {
        userRole = userData.roles[0]; // Используем первую роль из массива
      }
      
      // Создаем объект пользователя для передачи на фронтенд
      const userObject = {
        username: userData.username,
        displayName: userData.displayName,
        role: userRole, // Основная роль для отображения
        avatarPath: userData.avatarPath,
        coverPath: coverPath,
        lastLoginAt: userData.lastLoginAt,
        isSuperAdmin: userData.isSuperAdmin, // Флаг суперадмина
        roles: userData.roles // Все роли пользователя
      };
      
      console.log('[Auth] User login successful:', {
        username: userObject.username,
        role: userObject.role,
        isSuperAdmin: userObject.isSuperAdmin,
        roles: userObject.roles
      });
      
      return {
        ok: true,
        user: userObject
      };
    } catch (e) {
      console.error('[Auth] Login error:', e);
      return { ok: false, error: String(e) };
    }
  });
}

module.exports = { registerAuthHandlers };