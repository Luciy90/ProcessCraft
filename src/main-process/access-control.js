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
    if (!raw || raw.trim().length === 0) {
      console.warn('[AccessControl] Файл access.json пуст, вернём дефолтную конфигурацию');
      return {
        roles: ["SuperAdmin", "Admin", "User"],
        markers: {},
        access: {}
      };
    }

    let config;
    try {
      config = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[AccessControl] Ошибка парсинга access.json, содержимое файла может быть повреждено. Попытаемся восстановить дефолтную конфигурацию. Parse error:', parseErr.message);
      // Логируем небольшую часть содержимого для диагностики
      try { console.error('[AccessControl] access.json excerpt:', raw.slice(0, 1000)); } catch (e) {}
      return {
        roles: ["SuperAdmin", "Admin", "User"],
        markers: {},
        access: {}
      };
    }
    
    // Валидация конфигурации
    if (!config.roles || !Array.isArray(config.roles)) {
      throw new Error('AccessFileFormatError: Поле "roles" должно быть массивом');
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

/**
 * Поиск маркеров доступа в HTML-файлах и обновление файла доступа
 */
function updateAccessConfigWithMarkers() {
  try {
    console.log('[AccessControl] Starting marker scan and update process');
    
    // Получаем список всех HTML и JS файлов в проекте (шаблоны могут быть в HTML или в JS)
    const searchRoot = path.join(__dirname, '../renderer');
    const files = findFilesByExtensions(searchRoot, ['.html', '.htm', '.js']);

    // Собираем все маркеры доступа из найденных файлов
    // Теперь поддерживаем расширенные атрибуты: data-access-description и data-access-down
    const allMarkersSet = new Set();
    // Собираем временный словарь маркеров { id: { description, down } }
    const foundMarkersMap = {};

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const markers = extractAccessMarkers(content);
        // markers может быть массив объектов { id, description, down }
        markers.forEach(marker => {
          if (!marker || !marker.id) return;
          allMarkersSet.add(marker.id);
          // Если уже есть — не перезаписываем описание, оставляем первое найденное (предпочтительно в HTML)
          if (!foundMarkersMap[marker.id]) {
            foundMarkersMap[marker.id] = { description: marker.description || 'Требует заполнения', down: marker.down || null };
          } else {
            // если описание отсутствовало ранее, попробуем заполнить
            if ((!foundMarkersMap[marker.id].description || foundMarkersMap[marker.id].description === 'Требует заполнения') && marker.description) {
              foundMarkersMap[marker.id].description = marker.description;
            }
            if (!foundMarkersMap[marker.id].down && marker.down) {
              foundMarkersMap[marker.id].down = marker.down;
            }
          }
        });
      } catch (error) {
        console.warn(`Не удалось прочитать файл ${filePath}:`, error.message);
      }
    }

    console.log(`[AccessControl] Найдено маркеров: ${allMarkersSet.size}`);

    // Загружаем текущую конфигурацию доступа
    let config = loadAccessConfig();

    // Если файл конфигурации не существует, создаем новый дефолтный
    if (!config) {
      config = {
        roles: ["SuperAdmin", "Admin", "User"],
        markers: {},
        access: {}
      };
    }

    // Создаем новую структуру маркеров с правильной иерархией
    const newMarkersObj = {};
    
    // Сначала добавим все маркеры на верхнем уровне
    Array.from(allMarkersSet).forEach(markerId => {
      const markerData = foundMarkersMap[markerId] || { description: 'Требует заполнения', down: null };
      newMarkersObj[markerId] = { 
        description: markerData.description, 
        children: [] 
      };
    });

    // Затем обработаем вложенности (data-access-down)
    for (const [markerId, markerData] of Object.entries(foundMarkersMap)) {
      const down = markerData.down;
      if (down && newMarkersObj[markerId] && newMarkersObj[down]) {
        // Создаем объект для дочернего маркера с именем в качестве ключа
        const childObj = {};
        childObj[markerId] = newMarkersObj[markerId];
        
        // Добавляем в массив children родительского маркера
        newMarkersObj[down].children.push(childObj);
        
        // Удаляем дочерний маркер из верхнего уровня, так как он теперь вложен
        // Но только если он не используется где-то еще на верхнем уровне
        let isUsedAsTopLevel = false;
        for (const [otherId, otherData] of Object.entries(foundMarkersMap)) {
          if (otherId !== markerId && !otherData.down && otherData.description === markerData.description) {
            isUsedAsTopLevel = true;
            break;
          }
        }
        
        if (!isUsedAsTopLevel) {
          delete newMarkersObj[markerId];
        }
      }
    }

    // Всегда перезаписываем маркеры новой структурой
    config.markers = newMarkersObj;

    // Обновляем секцию доступа, добавляя новые маркеры ко всем ролям
    if (!config.access || typeof config.access !== 'object') {
      config.access = {};
    }
    
    // Убедимся, что все роли существуют
    const roles = config.roles || ["SuperAdmin", "Admin", "User"];
    roles.forEach(role => {
      if (!config.access[role]) {
        config.access[role] = [];
      }
    });

    // Сохраняем обновленную конфигурацию
    const saved = saveAccessConfig(config);
    if (saved) {
      console.log('[AccessControl] Файл доступа успешно обновлен при запуске программы');
    } else {
      console.error('[AccessControl] Не удалось сохранить файл доступа при запуске программы');
    }
  } catch (error) {
    console.error('[AccessControl] Ошибка при обновлении файла доступа:', error);
  }
}

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
 * Поиск файлов по расширениям в директории
 * @param {string} dirPath Путь к директории
 * @param {Array<string>} extensions Список расширений (с точкой), например ['.html', '.js']
 * @returns {Array<string>} Список путей к найденным файлам
 */
function findFilesByExtensions(dirPath, extensions) {
  try {
    const files = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Рекурсивно ищем в поддиректориях
        files.push(...findFilesByExtensions(fullPath, extensions));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  } catch (error) {
    console.error(`Ошибка при поиске файлов в ${dirPath}:`, error.message);
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
    // Регулярные выражения для поиска data-access-marker, data-access-description и data-access-down
    // Мы ищем участки вида: data-access-marker="id" (возможно в той же строке description/down)
    const markerRegex = /data-access-marker=["']([^"']+)["']/g;
    let match;

    while ((match = markerRegex.exec(content)) !== null) {
      const id = match[1];

      // Попробуем найти description и down рядом с найденным маркером (в пределах той же строки)
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const lineEnd = content.indexOf('\n', match.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

      // Попытка извлечь description и down из той же строки
      let description = null;
      let down = null;
      const descRegex = /data-access-description=["']([^"']*)["']/;
      const downRegex = /data-access-down=["']([^"']+)["']/;
      const dmatch = descRegex.exec(line);
      if (dmatch) description = dmatch[1];
      const downMatch = downRegex.exec(line);
      if (downMatch) down = downMatch[1];

      markers.push({ id, description, down });
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
      try {
        const markerKeys = markers && typeof markers === 'object' ? Object.keys(markers) : [];
        console.log('[AccessControl][IPC] Received markers payload:', { markerKeys, addedMarkers, removedMarkers, payloadType: typeof payload });
        if (markerKeys.length === 0) console.warn('[AccessControl][IPC] Received empty markers object');
      } catch (e) {
        console.log('[AccessControl][IPC] Received markers payload (unserializable):', { markers, addedMarkers, removedMarkers, payloadType: typeof payload });
      }
      
      // Загружаем текущую конфигурацию
      const config = loadAccessConfig();
      if (!config) {
        return { ok: false, error: 'Не удалось загрузить конфигурацию доступа', log: 'Failed to load access configuration file' };
      }
      
      // Всегда перезаписываем маркеры новой структурой (упрощенный подход)
      if (markers && typeof markers === 'object') {
        // Простая перезапись всей структуры маркеров
        config.markers = markers;
        
        // Объединяем существующие права доступа с новыми маркерами
        // чтобы не потерять уже установленные разрешения для ролей
        if (config.access && typeof config.access === 'object') {
          // Убедимся, что все маркеры представлены в секции доступа для каждой роли
          const allMarkers = Object.keys(markers);
          for (const role in config.access) {
            if (Array.isArray(config.access[role])) {
              // Добавляем недостающие маркеры в каждую роль (но не удаляем существующие)
              allMarkers.forEach(marker => {
                if (!config.access[role].includes(marker)) {
                  config.access[role].push(marker);
                }
              });
            }
          }
        }
      }

      // Сохраняем обновленную конфигурацию
      const saved = saveAccessConfig(config);
      if (!saved) {
        return { ok: false, error: 'Не удалось сохранить обновленную конфигурацию доступа', log: 'Failed to save access configuration file' };
      }
      
      console.log(`[AccessControl] Маркеры обновлены: добавлено ${addedMarkers?.length || 0}, удалено ${removedMarkers?.length || 0}`);
      return { ok: true, log: `Markers updated: added ${addedMarkers?.length || 0}, removed ${removedMarkers?.length || 0}` };
    } catch (error) {
      const errorMsg = `[AccessControl] Ошибка IPC при обновлении маркеров: ${error.message}`;
      console.error(errorMsg);
      return { ok: false, error: error.message, log: errorMsg };
    }
  });
}

module.exports = {
  updateAccessConfigWithMarkers,
  registerAccessControlHandlers
};