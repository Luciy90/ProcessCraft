const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Базовый путь для серверных данных внутри проекта
const serverRootPath = path.join(__dirname, '../../Server');
const accessConfigPath = path.join(serverRootPath, 'users', 'access.json');

/**
 * Загрузка конфигурации доступа
 * @returns {Object|null} Конфигурация доступа
 */
function loadAccessConfig() {
  try {
    if (!fs.existsSync(accessConfigPath)) {
      console.error('[AccessControl] Файл конфигурации доступа не найден:', accessConfigPath);
      return null;
    }
    
    const raw = fs.readFileSync(accessConfigPath, 'utf-8');
    const config = JSON.parse(raw);
    
    // Валидация конфигурации
    if (!config.roles || !Array.isArray(config.roles)) {
      throw new Error('AccessFileFormatError: Поле "roles" должно быть массивом');
    }
    
    if (!config.markers || !Array.isArray(config.markers)) {
      throw new Error('AccessFileFormatError: Поле "markers" должно быть массивом');
    }
    
    if (!config.access || typeof config.access !== 'object') {
      throw new Error('AccessFileFormatError: Поле "access" должно быть объектом');
    }
    
    console.log('[AccessControl] Конфигурация доступа успешно загружена');
    return config;
  } catch (error) {
    console.error('[AccessControl] Ошибка загрузки конфигурации доступа:', error);
    return null;
  }
}

/**
 * Сохранение конфигурации доступа
 * @param {Object} config Конфигурация доступа
 * @returns {boolean} Результат сохранения
 */
function saveAccessConfig(config) {
  try {
    fs.mkdirSync(path.dirname(accessConfigPath), { recursive: true });
    fs.writeFileSync(accessConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('[AccessControl] Конфигурация доступа успешно сохранена');
    return true;
  } catch (error) {
    console.error('[AccessControl] Ошибка сохранения конфигурации доступа:', error);
    return false;
  }
}

/**
 * Поиск маркеров доступа в HTML-файлах и обновление файла доступа
 */
function updateAccessConfigWithMarkers() {
  try {
    console.log('[AccessControl] Поиск маркеров доступа в HTML-файлах');
    
    // Получаем список всех HTML-файлов в проекте
    const htmlFiles = findHtmlFiles(path.join(__dirname, '../renderer'));
    
    // Собираем все маркеры доступа из HTML-файлов
    const allMarkers = new Set();
    
    for (const filePath of htmlFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const markers = extractAccessMarkers(content);
        markers.forEach(marker => allMarkers.add(marker));
      } catch (error) {
        console.warn(`Не удалось прочитать файл ${filePath}:`, error.message);
      }
    }
    
    console.log(`[AccessControl] Найдено маркеров: ${allMarkers.size}`);
    
    // Загружаем текущую конфигурацию доступа
    let config = loadAccessConfig();
    
    // Если файл конфигурации не существует, создаем новый
    if (!config) {
      config = {
        roles: ["SuperAdmin", "Admin", "User"],
        markers: [],
        access: {
          "SuperAdmin": [],
          "Admin": [],
          "User": []
        }
      };
    }
    
    // Получаем текущие маркеры из конфигурации
    const existingMarkers = new Set(config.markers || []);
    
    // Определяем новые и удаленные маркеры
    const newMarkers = [];
    const removedMarkers = [];
    
    // Проверяем, какие маркеры добавились
    for (const marker of allMarkers) {
      if (!existingMarkers.has(marker)) {
        newMarkers.push(marker);
      }
    }
    
    // Проверяем, какие маркеры удалены
    for (const marker of existingMarkers) {
      if (!allMarkers.has(marker)) {
        removedMarkers.push(marker);
      }
    }
    
    console.log(`[AccessControl] Новые маркеры: ${newMarkers.length}, удаленные маркеры: ${removedMarkers.length}`);
    
    // Обновляем список маркеров в конфигурации
    config.markers = Array.from(allMarkers);
    
    // Для новых маркеров не изменяем существующие привязки доступа
    // Для удаленных маркеров удаляем их из всех списков доступа
    if (removedMarkers.length > 0) {
      for (const [role, roleMarkers] of Object.entries(config.access)) {
        config.access[role] = roleMarkers.filter(marker => !removedMarkers.includes(marker));
      }
    }
    
    // Сохраняем обновленную конфигурацию
    const saved = saveAccessConfig(config);
    if (saved) {
      console.log('[AccessControl] Файл доступа успешно обновлен');
    } else {
      console.error('[AccessControl] Не удалось сохранить файл доступа');
    }
  } catch (error) {
    console.error('[AccessControl] Ошибка при обновлении файла доступа:', error);
  }
}

/**
 * Поиск HTML-файлов в директории
 * @param {string} dirPath Путь к директории
 * @returns {Array<string>} Список путей к HTML-файлах
 */
function findHtmlFiles(dirPath) {
  try {
    const files = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Рекурсивно ищем в поддиректориях
        files.push(...findHtmlFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.html')) {
        // Добавляем HTML-файл
        files.push(fullPath);
      }
    }
    
    return files;
  } catch (error) {
    console.error(`Ошибка при поиске HTML-файлов в ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Извлечение маркеров доступа из HTML-контента
 * @param {string} content HTML-контент
 * @returns {Array<string>} Список маркеров доступа
 */
function extractAccessMarkers(content) {
  try {
    const markers = [];
    // Регулярное выражение для поиска атрибута data-access-marker
    const markerRegex = /data-access-marker=["']([^"']+)["']/g;
    let match;
    
    while ((match = markerRegex.exec(content)) !== null) {
      markers.push(match[1]);
    }
    
    return markers;
  } catch (error) {
    console.error('Ошибка при извлечении маркеров доступа:', error.message);
    return [];
  }
}

// Регистрация IPC обработчиков для контроля доступа
function registerAccessControlHandlers() {
  // IPC обработчик для загрузки конфигурации доступа
  ipcMain.handle('access:loadConfig', async () => {
    try {
      const config = loadAccessConfig();
      if (!config) {
        return { ok: false, error: 'Не удалось загрузить конфигурацию доступа' };
      }
      
      return { ok: true, config };
    } catch (error) {
      console.error('[AccessControl] Ошибка IPC при загрузке конфигурации:', error);
      return { ok: false, error: error.message };
    }
  });

  // IPC обработчик для обновления маркеров в конфигурации
  ipcMain.handle('access:updateMarkers', async (event, payload) => {
    try {
      const { markers, addedMarkers, removedMarkers } = payload || {};
      
      // Загружаем текущую конфигурацию
      const config = loadAccessConfig();
      if (!config) {
        return { ok: false, error: 'Не удалось загрузить конфигурацию доступа' };
      }
      
      // Обновляем список маркеров
      config.markers = markers || config.markers;
      
      // Для добавленных маркеров не изменяем существующие привязки доступа
      // Для удаленных маркеров удаляем их из всех списков доступа
      if (removedMarkers && removedMarkers.length > 0) {
        for (const [role, roleMarkers] of Object.entries(config.access)) {
          config.access[role] = roleMarkers.filter(marker => !removedMarkers.includes(marker));
        }
      }
      
      // Сохраняем обновленную конфигурацию
      const saved = saveAccessConfig(config);
      if (!saved) {
        return { ok: false, error: 'Не удалось сохранить обновленную конфигурацию доступа' };
      }
      
      console.log(`[AccessControl] Маркеры обновлены: добавлено ${addedMarkers?.length || 0}, удалено ${removedMarkers?.length || 0}`);
      return { ok: true };
    } catch (error) {
      console.error('[AccessControl] Ошибка IPC при обновлении маркеров:', error);
      return { ok: false, error: error.message };
    }
  });
}

module.exports = {
  updateAccessConfigWithMarkers,
  registerAccessControlHandlers
};