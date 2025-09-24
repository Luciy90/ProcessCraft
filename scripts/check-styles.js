// scripts/check-styles.js
// Простая проверка: ищет <style> теги и `style="animation:` в проекте вне папки src/renderer/js/modules и design

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoreDirs = [
  path.join('src', 'renderer', 'js', 'modules'),
  'design'
].map(p => path.resolve(root, p));

// Также игнорируем саму папку со скриптами
ignoreDirs.push(path.resolve(root, 'scripts'));

const matches = [];

function shouldIgnore(filePath) {
  const abs = path.resolve(filePath);
  return ignoreDirs.some(d => abs.startsWith(d));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // пропустить node_modules и .git
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(full);
    } else {
      if (shouldIgnore(full)) continue;
      if (!/\.(html|js|htm|jsx|ts|tsx)$/.test(e.name)) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (/<style[\s>]/i.test(content)) {
        matches.push({ file: full, reason: 'найден тег <style>' });
      }
      if (/style=\"[^\"]*animation:/i.test(content)) {
        matches.push({ file: full, reason: 'найден встроенный стиль анимации' });
      }
    }
  }
}

walk(root);

if (matches.length === 0) {
  console.log('ПРОЙДЕНО: Не найдено тегов <style> или встроенных стилей анимации вне модулей/дизайна.');
  process.exit(0);
} else {
  console.log('НАЙДЕНЫ проблемы:');
  for (const m of matches) console.log(m.file + ' -> ' + m.reason);
  process.exit(2);
}
