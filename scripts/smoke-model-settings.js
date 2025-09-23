const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'renderer', 'js', 'model_settings.js');
try {
  const content = fs.readFileSync(file, 'utf8');
  const hasExport = /export\s+function\s+initModelSettings\s*\(/.test(content) || /export\s+default\s+\{\s*initModelSettings\s*\}/.test(content);
  if (hasExport) {
    console.log('OK: model_settings.js exports initModelSettings');
    process.exit(0);
  } else {
    console.error('FAIL: initModelSettings export not found in model_settings.js');
    process.exit(2);
  }
} catch (e) {
  console.error('ERROR reading file:', e.message);
  process.exit(3);
}
