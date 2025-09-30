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
      markers: [],
      access: {}
    };
  }

  // Обновляем список маркеров в конфигурации
  // Вместо перезаписи аккуратно объединим найденные маркеры с уже существующими
  // записями, чтобы не потерять описания и вложения.
  const existingMarkersRaw = config.markers;
  let existingMarkersObj = {};

  if (existingMarkersRaw && !Array.isArray(existingMarkersRaw) && typeof existingMarkersRaw === 'object') {
    existingMarkersObj = existingMarkersRaw;
  } else if (Array.isArray(existingMarkersRaw)) {
    // Конвертируем старый массив в объект с дефолтными описаниями
    existingMarkersRaw.forEach(k => {
      existingMarkersObj[k] = existingMarkersObj[k] || { description: 'Требует заполнения', children: [] };
    });
  }

  const existingKeys = Object.keys(existingMarkersObj);
  const foundMarkers = Array.from(allMarkersSet);

  // Вычисляем добавленные и удаленные маркеры относительно объектной структуры
  const newMarkers = foundMarkers.filter(m => !existingKeys.includes(m));
  const removedMarkers = existingKeys.filter(k => !allMarkersSet.has(k));

  console.log(`[AccessControl] Новые маркеры: ${newMarkers.length}, потенциально удаленные маркеры: ${removedMarkers.length}`);

  // Добавим найденные маркеры в существующий объект (если их ещё нет)
  foundMarkers.forEach(m => {
    if (!existingMarkersObj[m]) {
      const md = foundMarkersMap[m] && foundMarkersMap[m].description ? foundMarkersMap[m].description : 'Требует заполнения';
      existingMarkersObj[m] = { description: md, children: [] };
    }
  });

  // Обработаем вложенности (data-access-down): если маркер указывает на существующий маркер — сделаем вложенность
  for (const [mid, meta] of Object.entries(foundMarkersMap)) {
    const down = meta.down;
    if (down && existingMarkersObj[mid]) {
      // Если родитель существует в объекте — добавим как дочерний
      if (existingMarkersObj[down]) {
        // Убедимся, что mid не уже в children
        const already = (existingMarkersObj[down].children || []).some(c => (typeof c === 'string' ? c : c.id) === mid || (c && c.description && c.description === existingMarkersObj[mid].description));
        if (!already) {
          // Для совместимости children — массив объектов вида { description, children }
          existingMarkersObj[down].children = existingMarkersObj[down].children || [];
          existingMarkersObj[down].children.push({ description: existingMarkersObj[mid].description, children: existingMarkersObj[mid].children || [] });
          // Удаляем верхний уровень записи mid, чтобы дочерние были только внутри parent
          if (existingMarkersObj[mid]) {
            delete existingMarkersObj[mid];
          }
        }
      }
    }
  }

  // Не удаляем существующие маркеры автоматически, чтобы избежать нежелательной потери данных.
  // Оставляем роль/доступ без изменений — удаление маркера из списков ролей должно быть
  // явным действием администратора и не выполняться автоматически при старте.
  config.markers = existingMarkersObj;

  // Сохраняем обновленную конфигурацию
  console.log('[AccessControl] Примечание: маркеры добавлены в конфигурацию. Списки доступа ролей не изменяются автоматически на старте (для удаления используется явный флаг).');
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
        return { ok: false, error: 'Не удалось загрузить конфигурацию доступа' };
      }
      
      // Обновляем список маркеров.
      // Поддерживаем несколько сценариев:
      // - markers === object: считаем, что пришла иерархия с описаниями; по умолчанию мержим с существующими
      // - markers === array: конвертируем в объект с дефолтными описаниями и мержим
      // - Для явного перезаписывания можно указать payload.overwriteMarkers === true
      if (markers) {
        const overwrite = !!payload.overwriteMarkers;
        const pruneRoles = !!payload.pruneRoles;

        // Загружаем текущие маркеры в объектную форму
        const existingRaw = config.markers;
        let existingObj = {};
        if (existingRaw && !Array.isArray(existingRaw) && typeof existingRaw === 'object') {
          existingObj = existingRaw;
        } else if (Array.isArray(existingRaw)) {
          existingRaw.forEach(k => {
            existingObj[k] = existingObj[k] || { description: 'Требует заполнения', children: [] };
          });
        }

        if (Array.isArray(markers)) {
          // Конвертируем массив в объект и мержим
          markers.forEach(k => {
            if (!existingObj[k]) existingObj[k] = { description: 'Требует заполнения', children: [] };
          });
          config.markers = existingObj;
        } else if (markers && typeof markers === 'object') {
          if (overwrite) {
            // Явное перезапись: сохраняем как есть
            config.markers = markers;
          } else {
            // Мержим: сохраняем существующие описания, дополняя новыми ключами
            const merged = Object.assign({}, existingObj);
            for (const [k, v] of Object.entries(markers)) {
              if (!merged[k]) merged[k] = v;
              else {
                // Сохранить описание, если оно задано в новом payload — иначе оставить старое
                merged[k].description = v.description || merged[k].description || 'Требует заполнения';
                // Для детей: если в payload есть массив детей — берём его, иначе сохраняем старые
                merged[k].children = Array.isArray(v.children) ? v.children : (merged[k].children || []);
              }
            }
            config.markers = merged;
          }
        }

        // Если запрошено, удалить маркеры из ролей (признак pruneRoles). По умолчанию не выполняем удаления.
        if (pruneRoles && removedMarkers && removedMarkers.length > 0) {
          for (const [role, roleMarkers] of Object.entries(config.access)) {
            if (Array.isArray(roleMarkers)) {
              config.access[role] = roleMarkers.filter(marker => !removedMarkers.includes(marker));
            }
          }
        }
      }

      // Если в payload пришла явная секция access (роли -> массив маркеров), обновим её в конфиге
      if (payload && payload.access && typeof payload.access === 'object') {
        try {
          // Мержим: сохраняем существующие роли и дополняем новыми ключами из payload.access
          config.access = config.access || {};
          for (const [role, arr] of Object.entries(payload.access)) {
            if (!Array.isArray(arr)) continue;
            // Если роли в конфиге нет — добавим, иначе оставим существующий список (не перезаписываем по умолчанию)
            if (!config.access[role]) {
              config.access[role] = arr.slice();
            }
          }
        } catch (e) {
          console.warn('[AccessControl] Failed to merge payload.access into config.access:', e);
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