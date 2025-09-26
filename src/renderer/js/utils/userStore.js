// Простое хранилище пользователей на стороне рендерера с IPC вызовами
const { ipcRenderer } = require('electron');

const SESSION_KEY = 'pc_current_user';

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('getCurrentUser error', e);
    return null;
  }
}

function setCurrentUser(user) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

async function login(username, password) {
  const res = await ipcRenderer.invoke('auth:login', { username, password });
  if (res?.ok) setCurrentUser(res.user);
  return res;
}

async function logout() {
  await ipcRenderer.invoke('auth:logout');
  setCurrentUser(null);
}

async function listUsers() {
  return ipcRenderer.invoke('users:list');
}

async function getUser(username) {
  return ipcRenderer.invoke('users:get', username);
}

async function getUserProfile(username) {
  return ipcRenderer.invoke('users:getProfile', username);
}

async function saveUserProfile(username, profile) {
  return ipcRenderer.invoke('users:saveProfile', { username, profile });
}

async function getSection(username, section) {
  return ipcRenderer.invoke('users:getSection', { username, section });
}

async function saveSection(username, section, data) {
  return ipcRenderer.invoke('users:saveSection', { username, section, data });
}

async function createUser(payload) {
  return ipcRenderer.invoke('users:create', payload);
}

async function saveUser(username, updates) {
  return ipcRenderer.invoke('users:save', { username, updates });
}

async function deleteUser(username) {
  return ipcRenderer.invoke('users:delete', username);
}

async function uploadCover(username, fileData) {
  return ipcRenderer.invoke('upload:cover', { username, fileData, fileName: fileData.fileName || `cover_${username}.jpg` });
}

async function uploadAvatar(username, fileData) {
  return ipcRenderer.invoke('upload:avatar', { username, fileData, fileName: fileData.fileName || `avatar_${username}.jpg` });
}

// Генерация цвета аватара на основе имени пользователя
function generateAvatarColor(username) {
  if (!username) return { hue: 0, saturation: 80, brightness: 80 };
  
  // Преобразование имени пользователя в число (1-354 для оттенка)
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 354 + 1; // 1-354 range
  
  return { hue, saturation: 80, brightness: 80 };
}

// Получение или генерация цвета аватара для пользователя
async function getAvatarColor(username) {
  try {
    const userData = await getUser(username);
    if (userData?.ok && userData.user?.avatarColor) {
      return userData.user.avatarColor;
    }
    
    // Генерация нового цвета, если он не существует
    const color = generateAvatarColor(username);
    
    // Сохранение в user.json
    if (userData?.ok) {
      await saveUser(username, { avatarColor: color });
    }
    
    return color;
  } catch (error) {
    console.warn('Failed to get/generate avatar color:', error);
    return generateAvatarColor(username);
  }
}

// Проверка существования файла аватара
async function checkAvatarFileExists(avatarPath) {
  if (!avatarPath) return false;
  try {
    const result = await ipcRenderer.invoke('file:exists', avatarPath);
    return result?.exists || false;
  } catch (error) {
    console.warn('Failed to check avatar file existence:', error);
    return false;
  }
}

window.UserStore = {
  getCurrentUser,
  setCurrentUser,
  login,
  logout,
  listUsers,
  getUser,
  createUser,
  saveUser,
  deleteUser,
  getUserProfile,
  saveUserProfile,
  getSection,
  saveSection,
  uploadCover,
  uploadAvatar,
  generateAvatarColor,
  getAvatarColor,
  checkAvatarFileExists
};


