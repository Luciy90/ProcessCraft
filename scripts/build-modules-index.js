#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Генератор modules/index.json
// Сканирует папки в src/renderer/js/modules и собирает .js файлы в массив modules

const ROOT = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'src', 'renderer', 'js', 'modules');
const INDEX_FILE = path.join(MODULES_DIR, 'index.json');

function scanModules(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const modules = [];

  for (const entry of entries) {
    if (entry.name === 'index.json') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Ищем файл <folder>/<folder>.js или любые .js внутри
      const candidate = path.join(full, `${entry.name}.js`);
      if (fs.existsSync(candidate)) {
        modules.push(`${entry.name}/${entry.name}.js`);
        continue;
      }
      // иначе берем первый .js файл в папке
      const inner = fs.readdirSync(full).find(f => f.endsWith('.js'));
      if (inner) modules.push(`${entry.name}/${inner}`);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      modules.push(entry.name);
    }
  }

  // Сортируем для детерминированности
  modules.sort();
  return modules;
}

function buildIndex() {
  if (!fs.existsSync(MODULES_DIR)) {
    console.error('Modules directory not found:', MODULES_DIR);
    process.exit(1);
  }

  const modules = scanModules(MODULES_DIR);

  const payload = {
    modules,
    generated_at: new Date().toISOString(),
    generator: 'ProcessCraft Build System',
    version: '2.0.0',
    structure: 'folder-based',
    description: 'Автогенерируемый список модулей (modules/index.json)'
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log('Пересобран modules/index.json — модулей:', modules.length);
}

if (require.main === module) {
  try {
    buildIndex();
    process.exit(0);
  } catch (e) {
    console.error('Failed to build modules index:', e);
    process.exit(2);
  }
}
