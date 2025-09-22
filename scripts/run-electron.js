#!/usr/bin/env node
const child = require('child_process');
const path = require('path');
const fs = require('fs');

function ensureUtf8Console() {
  try {
    // Попытка сменить кодовую страницу консоли на UTF-8
    // Выполняем в shell, т.к. chcp является внутренней командой
    child.execSync('chcp 65001', { stdio: 'ignore' });
    console.log('Установлена кодовая страница консоли: 65001 (UTF-8)');
  } catch (e) {
    // не критично
    console.warn('Не удалось сменить кодовую страницу на UTF-8:', e.message);
  }
}

function findLocalElectron() {
  const win = path.join(process.cwd(), 'node_modules', '.bin', 'electron.cmd');
  const nix = path.join(process.cwd(), 'node_modules', '.bin', 'electron');
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(nix)) return nix;
  return null;
}

function runElectron() {
  ensureUtf8Console();
  // Выполнить сборку модулей (скрипт build-module-index.js) после установки кодовой страницы.
  try {
    const buildScript = path.join(__dirname, 'build-module-index.js');
    if (fs.existsSync(buildScript)) {
      console.log('Запуск сборщика модулей:', buildScript);
      // На Windows нужно выполнить chcp 65001 в той же оболочке, где запускается node,
      // иначе дочерний процесс может печатать в другой кодовой странице.
      if (process.platform === 'win32') {
        const cmd = `cmd.exe /c "chcp 65001 >NUL & node "${buildScript}""`;
        child.execSync(cmd, { stdio: 'inherit' });
      } else {
        child.spawnSync('node', [buildScript], { stdio: 'inherit', shell: false });
      }
    }
  } catch (e) {
    console.warn('Не удалось запустить сборщик модулей:', e.message);
  }

  const electronCmd = findLocalElectron();
    if (electronCmd) {
    const useShell = process.platform === 'win32';
    const env = Object.assign({}, process.env, { PROCESSCRAFT_BUILD_DONE: '1' });
    const spawned = child.spawn(electronCmd, ['.'], { stdio: 'inherit', shell: useShell, env });
    spawned.on('exit', (code) => process.exit(code));
  } else {
    // fallback: попытаемся вызвать через npx
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const env = Object.assign({}, process.env, { PROCESSCRAFT_BUILD_DONE: '1' });
    const spawned = child.spawn(cmd, ['electron', '.'], { stdio: 'inherit', shell: process.platform === 'win32', env });
    spawned.on('exit', (code) => process.exit(code));
  }
}

if (require.main === module) runElectron();
