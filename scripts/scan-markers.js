const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const rendererRoot = path.join(projectRoot, 'src', 'renderer');
const accessFile = path.join(projectRoot, 'Server', 'users', 'access.json');

function findFilesByExtensions(dirPath, extensions) {
  try {
    const files = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...findFilesByExtensions(fullPath, extensions));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (extensions.includes(ext)) files.push(fullPath);
      }
    }

    return files;
  } catch (err) {
    console.error('scan error', err.message);
    return [];
  }
}

function extractMarkers(content) {
  const markers = [];
  const re = /data-access-marker=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) markers.push(m[1]);
  return markers;
}

function loadConfig() {
  try {
    if (!fs.existsSync(accessFile)) return null;
    return JSON.parse(fs.readFileSync(accessFile, 'utf8'));
  } catch (e) {
    console.error('loadConfig error', e.message);
    return null;
  }
}

function saveConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(accessFile), { recursive: true });
    fs.writeFileSync(accessFile, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('saveConfig error', e.message);
    return false;
  }
}

(function main(){
  console.log('Scanning renderer for markers...');
  const files = findFilesByExtensions(rendererRoot, ['.html', '.htm', '.js']);
  const all = new Set();
  for (const f of files) {
    try {
      const c = fs.readFileSync(f, 'utf8');
      extractMarkers(c).forEach(m => all.add(m));
    } catch (e) {
      // ignore read errors
    }
  }
  const found = Array.from(all);
  console.log('Found markers:', found.length, found);

  let cfg = loadConfig();
  if (!cfg) cfg = { roles: { "SuperAdmin": {}, "Admin": {}, "User": {} }, markers: [], access: {} };

  // Вместо полной перезаписи маркеров, объединяем существующие с найденными
  const existing = Array.isArray(cfg.markers) ? cfg.markers : [];
  
  // Добавляем только новые маркеры, сохраняя существующие
  const newMarkers = found.filter(m => !existing.includes(m));
  const updatedMarkers = [...existing];
  
  // Добавляем новые маркеры в список
  newMarkers.forEach(marker => {
    if (!updatedMarkers.includes(marker)) {
      updatedMarkers.push(marker);
    }
  });
  
  // Не удаляем существующие маркеры, даже если они не найдены в текущем сканировании
  cfg.markers = updatedMarkers;
  
  // Обновляем секцию доступа, добавляя новые маркеры ко всем ролям, но не удаляя существующие
  if (cfg.access && typeof cfg.access === 'object') {
    for (const [role, roleMarkers] of Object.entries(cfg.access)) {
      if (Array.isArray(roleMarkers)) {
        // Добавляем только новые маркеры, которых еще нет в списке доступа
        newMarkers.forEach(marker => {
          if (!roleMarkers.includes(marker)) {
            roleMarkers.push(marker);
          }
        });
      }
    }
  }
  
  // Убедимся, что все роли из объекта roles имеют записи в объекте access с пустыми массивами в качестве значений
  // Если запись для роли существует, мы не изменяем её. Если записи нет, то добавляем её.
  if (cfg.roles && typeof cfg.roles === 'object' && !Array.isArray(cfg.roles) && cfg.access && typeof cfg.access === 'object') {
    for (const role in cfg.roles) {
      if (!cfg.access.hasOwnProperty(role)) {
        cfg.access[role] = [];
      }
    }
  }

  const ok = saveConfig(cfg);
  console.log('Saved:', ok, 'New:', newMarkers.length);
})();
