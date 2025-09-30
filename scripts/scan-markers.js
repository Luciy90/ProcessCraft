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
  if (!cfg) cfg = { roles: ['SuperAdmin','Admin','User'], markers: [], access: {} };

  const existing = Array.isArray(cfg.markers) ? cfg.markers : [];
  const newMarkers = found.filter(m => !existing.includes(m));
  const removed = existing.filter(m => !all.has(m));

  cfg.markers = found;
  if (removed.length && cfg.access && typeof cfg.access === 'object') {
    for (const [role, roleMarkers] of Object.entries(cfg.access)) {
      if (Array.isArray(roleMarkers)) cfg.access[role] = roleMarkers.filter(x => !removed.includes(x));
    }
  }

  const ok = saveConfig(cfg);
  console.log('Saved:', ok, 'New:', newMarkers.length, 'Removed:', removed.length);
})();
