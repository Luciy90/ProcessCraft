const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Проверка наличия у пользователя определенной роли
 * @param {Object} userProfile - Профиль пользователя
 * @param {string} roleName - Название роли для проверки
 * @returns {boolean} Имеет ли пользователь указанную роль
 */
function hasRole(userProfile, roleName) {
  try {
    // Проверяем, что userProfile существует и имеет массив ролей
    if (!userProfile?.roles?.length) {
      return false;
    }
    
    // Проверяем наличие роли в массиве ролей пользователя
    return userProfile.roles.includes(roleName);
  } catch (error) {
    console.error('Ошибка проверки роли пользователя:', error);
    return false;
  }
}

/**
 * Проверка наличия у пользователя любой из указанных ролей
 * @param {Object} userProfile - Профиль пользователя
 * @param {Array<string>} roleNames - Массив названий ролей для проверки
 * @returns {boolean} Имеет ли пользователь хотя бы одну из указанных ролей
 */
function hasAnyRole(userProfile, roleNames) {
  try {
    // Проверяем, что userProfile существует и имеет массив ролей
    if (!userProfile?.roles?.length || !roleNames?.length) {
      return false;
    }
    
    // Проверяем наличие хотя бы одной роли из массива
    return userProfile.roles.some(role => roleNames.includes(role));
  } catch (error) {
    console.error('Ошибка проверки ролей пользователя:', error);
    return false;
  }
}

/**
 * Получение списка всех ролей пользователя
 * @param {Object} userProfile - Профиль пользователя
 * @returns {Array<string>} Массив названий ролей пользователя
 */
function getUserRoles(userProfile) {
  try {
    // Проверяем, что userProfile существует и имеет массив ролей
    if (!userProfile?.roles?.length) {
      return [];
    }
    
    // Возвращаем массив ролей пользователя
    return [...userProfile.roles]; // Создаем копию массива для безопасности
  } catch (error) {
    console.error('Ошибка получения ролей пользователя:', error);
    return [];
  }
}

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
    if (!raw || raw.trim()?.length === 0) {
      console.warn('[AccessControl] Файл access.json пуст, вернём дефолтную конфигурацию');
      return {
        markers: {},
        access: {},
        generated_at: new Date().toISOString()
      };
    }

    let config;
    try {
      config = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[AccessControl] Ошибка парсинга access.json, содержимое файла может быть повреждено. Попытаемся восстановить дефолтную конфигурацию. Parse error:', parseErr.message);
      // Логируем небольшую часть содержимого для диагностики
      try { console.error('[AccessControl] access.json excerpt:', raw.slice?.(0, 1000)); } catch (e) {}
      return {
        markers: {},
        access: {},
        generated_at: new Date().toISOString()
      };
    }
    
    // markers может быть либо массивом идентификаторов (старый формат), либо объектом (новый формат с описаниями и вложениями)
    if (!config.markers || (!(Array.isArray(config.markers) || typeof config.markers === 'object'))) {
      throw new Error('AccessFileFormatError: Поле "markers" должно быть массивом или объектом');
    }
    
    if (!config.access || typeof config.access !== 'object') {
      throw new Error('AccessFileFormatError: Поле "access" должно быть объектом');
    }
    
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

// createBaseAccessConfig/remove: роли больше не создаются и не управляются через JSON

/**
 * Поиск HTML-файлов в директории
 * @param {string} dirPath Путь к директории
 * @returns {Array<string>} Список путей к HTML-файлам
 */
function findHtmlFiles(dirPath) {
  try {
    const files = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory?.()) {
        // Рекурсивно ищем в поддиректориях
        files.push(...findHtmlFiles(fullPath));
      } else if (item.isFile?.() && (item.name.endsWith?.('.html') || item.name.endsWith?.('.js'))) {
        // Добавляем HTML и JS файлы
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
 * Извлечение маркеров доступа из контента файла
 * @param {string} content Контент файла
 * @returns {Array<Object>} Список маркеров доступа
 */
function extractAccessMarkers(content) {
  try {
    const markers = [];
    // Регулярные выражения для поиска data-access-marker, data-access-description и data-access-down
    // Мы ищем участки вида: data-access-marker="id" (возможно в той же строке description/down)
    const markerRegex = /data-access-marker=["']([^"']+)["']/g;
    let match;

    while ((match = markerRegex.exec?.(content)) !== null) {
      const id = match[1];

      // Попробуем найти description и down рядом с найденным маркером (в пределах той же строки)
      const lineStart = content.lastIndexOf?.('\n', match.index) + 1;
      const lineEnd = content.indexOf?.('\n', match.index);
      const line = content.substring?.(lineStart, lineEnd === -1 ? content.length : lineEnd);

      // Попытка извлечь description и down из той же строки
      let description = null;
      let down = null;
      const descRegex = /data-access-description=["']([^"']*)["']/;
      const downRegex = /data-access-down=["']([^"']+)["']/;
      const dmatch = descRegex.exec?.(line);
      if (dmatch) description = dmatch[1];
      const downMatch = downRegex.exec?.(line);
      if (downMatch) down = downMatch[1];

      markers.push({ id, description, down });
    }

    return markers;
  } catch (error) {
    console.error('Ошибка при извлечении маркеров доступа:', error.message);
    return [];
  }
}

/**
 * Построение иерархической структуры маркеров
 * @param {Array<Object>} foundMarkers Список найденных маркеров
 * @returns {Object} Иерархическая структура маркеров
 */
function buildMarkersHierarchy(foundMarkers) {
  // Создаем карту маркеров для быстрого доступа
  const markerMap = {};
  foundMarkers.forEach(marker => {
    // Для пустых или некорректных значений description подставляем "Требует заполнения"
    const description = (!marker.description || marker.description.trim?.() === '') ? 'Требует заполнения' : marker.description;
    
    markerMap[marker.id] = {
      description: description,
      children: []
    };
  });

  // Формируем иерархию
  const hierarchy = {};
  
  foundMarkers.forEach(marker => {
    if (marker.down && markerMap?.[marker.down]) {
      // Добавляем как дочерний элемент
      const childEntry = {};
      childEntry[marker.id] = markerMap[marker.id];
      markerMap[marker.down].children.push(childEntry);
    } else {
      // Добавляем как корневой элемент
      hierarchy[marker.id] = markerMap[marker.id];
    }
  });
  
  // Удаляем дочерние маркеры из верхнего уровня
  foundMarkers.forEach(marker => {
    if (marker.down && hierarchy?.[marker.id]) {
      delete hierarchy[marker.id];
    }
  });
  
  return hierarchy;
}

/**
 * Актуализация структуры доступа
 * @param {Object} config Конфигурация доступа
 * @returns {Object} Обновленная конфигурация
 */
function updateAccessStructure(config) {
  // Роли управляются в SQL. Здесь лишь гарантируем корректную форму разделов markers/access
  if (!config || typeof config !== 'object') return { markers: {}, access: {}, generated_at: new Date().toISOString() };
  if (!config.markers || typeof config.markers !== 'object') config.markers = {};
  if (!config.access || typeof config.access !== 'object') config.access = {};
  return config;
}

/**
 * Поиск маркеров доступа в HTML-файлах и обновление файла доступа
 */
function updateAccessConfigWithMarkers() {
  try {
    console.log('[AccessControl] Starting marker scan and update process');
    
    // 1. Проверка существования файла Server\users\access.json
    let config;
    if (!fs.existsSync(accessConfigPath)) {
      // Минимальная структура без раздела roles
      config = { markers: {}, access: {}, generated_at: new Date().toISOString() };
      console.log('[AccessControl] Создан новый файл конфигурации доступа (без roles)');
    } else {
      config = loadAccessConfig() || { markers: {}, access: {} };
    }

    // 2. Роли не актуализируем здесь — управление ролями в SQL

    // 3. Анализ HTML и построение структуры маркеров
    // Выполнить поиск всех HTML-файлов в каталоге src, в том числе файлов, встроенных в JS
    const searchRoot = path.join(__dirname, '../renderer');
    const files = findHtmlFiles(searchRoot);
    console.log(`[AccessControl] Найдено файлов для анализа: ${files.length}`);

    // Собираем все маркеры доступа из найденных файлов
    const allMarkers = [];
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const markers = extractAccessMarkers(content);
        allMarkers.push(...markers);
        console.log(`[AccessControl] В файле ${filePath} найдено маркеров: ${markers.length}`);
      } catch (error) {
        console.warn(`[AccessControl] Не удалось прочитать файл ${filePath}:`, error.message);
      }
    }

    console.log(`[AccessControl] Всего найдено маркеров: ${allMarkers.length}`);

    // Построить иерархическую структуру маркеров с их описаниями и вложенностью
    const markersHierarchy = buildMarkersHierarchy(allMarkers);
    config.markers = markersHierarchy;
    console.log('[AccessControl] Построена иерархическая структура маркеров');

    // 4. Проверка структуры доступа
    config = updateAccessStructure(config);
    console.log('[AccessControl] Актуализирована структура доступа');

    // 5. Дата генерации
    config.generated_at = new Date().toISOString();
    console.log(`[AccessControl] Обновлена дата генерации: ${config.generated_at}`);

    // Сохраняем обновленную конфигурацию
    const saved = saveAccessConfig(config);
    if (saved) {
      console.log('[AccessControl] Файл доступа успешно обновлен');
    } else {
      console.error('[AccessControl] Не удалось сохранить файл доступа');
    }
  } catch (error) {
    console.error('[AccessControl] Ошибка при обновлении файла доступа:', error);
    return { error: `Ошибка при обновлении файла доступа: ${error.message}` };
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

  // IPC обработчик для обновления прав доступа (только для явных запросов)
  ipcMain.handle('access:updateAccess', async (event, payload) => {
    try {
      const { access } = payload ?? {};
      
      // Загружаем текущую конфигурацию
      const config = loadAccessConfig();
      if (!config) {
        return { ok: false, error: 'Не удалось загрузить конфигурацию доступа', log: 'Failed to load access configuration file' };
      }
      
      // Обновляем права доступа ТОЛЬКО если они переданы явно
      if (access && typeof access === 'object') {
        // Обновляем права доступа для каждой роли отдельно
        for (const role in access) {
          if (Array.isArray(access[role])) {
            config.access[role] = [...access[role]];
          }
        }
      }

      // Сохраняем обновленную конфигурацию
      const saved = saveAccessConfig(config);
      if (!saved) {
        return { ok: false, error: 'Не удалось сохранить обновленную конфигурацию доступа', log: 'Failed to save access configuration file' };
      }
      
      console.log('[AccessControl] Права доступа обновлены');
      return { ok: true, log: 'Access permissions updated' };
    } catch (error) {
      const errorMsg = `[AccessControl] Ошибка IPC при обновлении прав доступа: ${error.message}`;
      console.error(errorMsg);
      return { ok: false, error: error.message, log: errorMsg };
    }
  });
  
  // IPC обработчик для проверки ролей пользователя
  ipcMain.handle('access:hasRole', async (event, payload) => {
    try {
      const { userProfile, roleName } = payload ?? {};
      
      // Проверяем наличие роли у пользователя
      const hasRoleResult = hasRole(userProfile, roleName);
      
      return { ok: true, hasRole: hasRoleResult };
    } catch (error) {
      console.error('[AccessControl] Ошибка IPC при проверке роли пользователя:', error);
      return { ok: false, error: error.message };
    }
  });
  
  // IPC обработчик для проверки любых ролей пользователя
  ipcMain.handle('access:hasAnyRole', async (event, payload) => {
    try {
      const { userProfile, roleNames } = payload ?? {};
      
      // Проверяем наличие хотя бы одной роли у пользователя
      const hasAnyRoleResult = hasAnyRole(userProfile, roleNames);
      
      return { ok: true, hasAnyRole: hasAnyRoleResult };
    } catch (error) {
      console.error('[AccessControl] Ошибка IPC при проверке ролей пользователя:', error);
      return { ok: false, error: error.message };
    }
  });
}

module.exports = {
  hasRole,
  hasAnyRole,
  getUserRoles,
  updateAccessConfigWithMarkers,
  registerAccessControlHandlers
};