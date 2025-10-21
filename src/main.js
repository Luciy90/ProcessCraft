// Основной файл приложения ProcessCraft
// Содержит только импорты модулей приложения и их инициализацию

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// ==================== ИМПОРТ МОДУЛЕЙ ====================
// Импорт модуля запуска приложения
const { mainWindow, initializeApp, handleAppQuit } = require('./main-process/startapp.js');

// Импорт модуля работы с пользователями
const { 
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
} = require('./main-process/users.js');

// Импорт модуля аутентификации
const { registerAuthHandlers } = require('./main-process/auth.js');

// Импорт модуля работы с файлами
const { registerFileHandlers } = require('./main-process/files.js');

// Импорт модуля загрузки файлов
const { registerUploadHandlers } = require('./main-process/uploads.js');

// Импорт модуля контроля доступа
const { updateAccessConfigWithMarkers, registerAccessControlHandlers } = require('./main-process/access.js');

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================
// Инициализация приложения когда Electron готов
app.whenReady?.().then?.(() => {
  // Инициализация основного приложения
  initializeApp?.(updateAccessConfigWithMarkers, ensureUsersDir, getUserDir, getUserFile, writeJsonSafe);
  
  // Регистрация обработчиков IPC
  registerUserHandlers?.();
  registerAuthHandlers?.();
  registerFileHandlers?.(mainWindow);
  registerUploadHandlers?.();
  registerAccessControlHandlers?.();
  
  // Обработка закрытия приложения
  handleAppQuit?.();
});

// ==================== ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ МОДУЛЯХ ====================
// Экспорт mainWindow для использования в других частях приложения
module.exports = { mainWindow };
