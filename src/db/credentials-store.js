/**
 * Хранилище учетных данных, использующее только имена пользователей без паролей
 * Пароли хранятся в отдельной системе аутентификации в хешированном виде
 */
const fs = require('fs');
const path = require('path');
const { getUserCredentials } = require('./auth-service');

// Путь к файлу хранения учетных данных
const CREDENTIALS_FILE = path.join(__dirname, 'user-credentials.json');

/**
 * Инициализирует хранилище учетных данных с примерными данными
 * В реальном приложении это будет сделано через административный интерфейс
 */
function initializeCredentialsStore() {
  // Учетные данные для суперадмина приложения (только имя пользователя)
  const superAdminCredentials = {
    username: 'AppSuperAdmin',
    userType: 'superadmin',
    createdAt: new Date().toISOString()
  };
  
  // Учетные данные для обычного пользователя приложения (только имя пользователя)
  const regularUserCredentials = {
    username: 'AppSuperUser',
    userType: 'regular',
    createdAt: new Date().toISOString()
  };
  
  // Сохраняем в файл (в производственной среде это будет в безопасной базе данных)
  const credentialsStore = {
    superadmin: superAdminCredentials,
    regular: regularUserCredentials,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentialsStore, null, 2));
  console.log('Хранилище учетных данных инициализировано (только имена пользователей)');
  
  return credentialsStore;
}

/**
 * Загружает учетные данные из хранилища на основе типа пользователя
 * @param {string} userType - Тип пользователя ('superadmin' или 'regular')
 * @returns {Object} - Учетные данные пользователя (только имя пользователя)
 */
function loadCredentialsFromStore(userType) {
  try {
    // Проверяем, существует ли файл учетных данных
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      console.log('Хранилище учетных данных не найдено, инициализируем...');
      initializeCredentialsStore();
    }
    
    // Читаем и парсим файл учетных данных
    const credentialsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const credentialsStore = JSON.parse(credentialsData);
    
    // Получаем учетные данные для типа пользователя
    const credentials = credentialsStore[userType];
    if (!credentials) {
      throw new Error(`Учетные данные не найдены для типа пользователя: ${userType}`);
    }
    
    // Проверяем, что пользователь существует в системе аутентификации
    const user = getUserCredentials(credentials.username);
    if (!user) {
      throw new Error(`Пользователь ${credentials.username} не найден в системе аутентификации`);
    }
    
    // Возвращаем только имя пользователя (без пароля)
    return {
      username: user.username,
      userType: credentials.userType
    };
  } catch (error) {
    console.error('Не удалось загрузить учетные данные из хранилища:', error);
    throw error;
  }
}

/**
 * Обновляет учетные данные в хранилище
 * @param {string} userType - Тип пользователя ('superadmin' или 'regular')
 * @param {Object} newCredentials - Новые учетные данные для хранения { username }
 */
function updateCredentialsInStore(userType, newCredentials) {
  try {
    // Загружаем существующие учетные данные
    let credentialsStore = {};
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const credentialsData = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      credentialsStore = JSON.parse(credentialsData);
    }
    
    // Проверяем, что пользователь существует в системе аутентификации
    const user = getUserCredentials(newCredentials.username);
    if (!user) {
      throw new Error(`Пользователь ${newCredentials.username} не найден в системе аутентификации`);
    }
    
    // Обновляем учетные данные
    credentialsStore[userType] = {
      username: newCredentials.username,
      userType: userType,
      createdAt: new Date().toISOString()
    };
    credentialsStore.lastUpdated = new Date().toISOString();
    
    // Сохраняем в файл
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentialsStore, null, 2));
    console.log(`Учетные данные для ${userType} успешно обновлены`);
  } catch (error) {
    console.error('Не удалось обновить учетные данные в хранилище:', error);
    throw error;
  }
}

module.exports = {
  initializeCredentialsStore,
  loadCredentialsFromStore,
  updateCredentialsInStore
};