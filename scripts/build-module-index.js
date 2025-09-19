#!/usr/bin/env node

/**
 * Автоматическая пересборка index.json для динамической системы модулей ProcessCraft
 * 
 * Сканирует директорию модулей и создает index.json с актуальным списком модулей
 * для использования в браузерном окружении как fallback механизм
 */

const fs = require('fs');
const path = require('path');

// Конфигурация
const MODULES_DIR = path.join(__dirname, '..', 'src', 'renderer', 'js', 'modules');
const INDEX_FILE = path.join(MODULES_DIR, 'index.json');

/**
 * Сканирует директорию модулей и возвращает список модулей
 * @returns {Array} Список модулей
 */
function scanModules() {
  console.log('[ModuleIndexBuilder] Сканирование директории модулей:', MODULES_DIR);
  
  // Проверяем существование директории
  if (!fs.existsSync(MODULES_DIR)) {
    console.error('[ModuleIndexBuilder] Директория модулей не найдена:', MODULES_DIR);
    process.exit(1);
  }
  
  const items = fs.readdirSync(MODULES_DIR);
  const modules = [];
  
  console.log(`[ModuleIndexBuilder] Найдено элементов: ${items.length}`);
  
  for (const item of items) {
    // Пропускаем служебные файлы
    if (item === 'index.json' || item === 'index.js') {
      continue;
    }
    
    const itemPath = path.join(MODULES_DIR, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Проверяем наличие JS файла модуля в директории
      const jsFile = `${item}.js`;
      const jsFilePath = path.join(itemPath, jsFile);
      
      if (fs.existsSync(jsFilePath)) {
        modules.push(`${item}/${jsFile}`);
        console.log(`[ModuleIndexBuilder] Найден модуль: ${item}/${jsFile}`);
      } else {
        console.warn(`[ModuleIndexBuilder] Пропущена директория (нет JS файла): ${item}`);
      }
    } else if (item.endsWith('.js')) {
      // Поддержка устаревшей плоской структуры
      modules.push(item);
      console.log(`[ModuleIndexBuilder] Найден модуль (плоская структура): ${item}`);
    }
  }
  
  console.log(`[ModuleIndexBuilder] Всего найдено модулей: ${modules.length}`);
  return modules;
}

/**
 * Загружает предыдущий index.json если он существует
 * @returns {Object|null} Предыдущий index.json или null
 */
function loadPreviousIndex() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const content = fs.readFileSync(INDEX_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('[ModuleIndexBuilder] Не удалось загрузить предыдущий index.json:', error.message);
  }
  return null;
}

/**
 * Сравнивает текущие и предыдущие модули и выводит сообщения об удаленных модулях
 * @param {Array} currentModules Текущий список модулей
 * @param {Object|null} previousIndex Предыдущий index.json
 */
function reportModuleChanges(currentModules, previousIndex) {
  if (!previousIndex || !Array.isArray(previousIndex.modules)) {
    return;
  }
  
  const previousModules = new Set(previousIndex.modules);
  const currentModuleSet = new Set(currentModules);
  
  // Находим удаленные модули
  const removedModules = [];
  for (const module of previousModules) {
    if (!currentModuleSet.has(module)) {
      removedModules.push(module);
    }
  }
  
  // Выводим сообщения об удаленных модулях
  if (removedModules.length > 0) {
    console.log(`[ModuleIndexBuilder] ⚠ Обнаружены удаленные модули (${removedModules.length}):`);
    for (const module of removedModules) {
      console.log(`[ModuleIndexBuilder] ⚠ Модуль отключен от системы: ${module}`);
    }
  }
  
  // Выводим общую статистику
  const addedModules = currentModules.filter(module => !previousModules.has(module));
  console.log(`[ModuleIndexBuilder] Статистика изменений:`);
  console.log(`[ModuleIndexBuilder]   - Добавлено: ${addedModules.length}`);
  console.log(`[ModuleIndexBuilder]   - Удалено: ${removedModules.length}`);
  console.log(`[ModuleIndexBuilder]   - Всего: ${currentModules.length}`);
}

/**
 * Генерирует содержимое index.json
 * @param {Array} modules Список модулей
 * @returns {Object} Объект index.json
 */
function generateIndexContent(modules) {
  return {
    modules: modules,
    generated_at: new Date().toISOString(),
    generator: "ProcessCraft Build System",
    version: "2.0.0",
    structure: "folder-based",
    description: "Модули организованы в отдельные папки с .js и .meta.json файлами"
  };
}

/**
 * Записывает index.json файл
 * @param {Object} index Содержимое index.json
 */
function writeIndexFile(index) {
  try {
    // Создаем резервную копию если файл существует
    if (fs.existsSync(INDEX_FILE)) {
      const backupFile = INDEX_FILE + '.backup';
      fs.copyFileSync(INDEX_FILE, backupFile);
      console.log(`[ModuleIndexBuilder] Создана резервная копия: ${backupFile}`);
    }
    
    // Записываем новый файл
    const content = JSON.stringify(index, null, 2);
    fs.writeFileSync(INDEX_FILE, content);
    console.log(`[ModuleIndexBuilder] ✓ Успешно создан index.json: ${INDEX_FILE}`);
    console.log(`[ModuleIndexBuilder] Содержит ${index.modules.length} модулей`);
  } catch (error) {
    console.error('[ModuleIndexBuilder] ✗ Ошибка записи index.json:', error);
    process.exit(1);
  }
}

/**
 * Основная функция генерации
 */
function generateIndex() {
  console.log('[ModuleIndexBuilder] Начало генерации index.json');
  
  try {
    // Загружаем предыдущий index.json для сравнения
    const previousIndex = loadPreviousIndex();
    
    const modules = scanModules();
    
    // Сравниваем с предыдущим списком и выводим сообщения об изменениях
    reportModuleChanges(modules, previousIndex);
    
    const index = generateIndexContent(modules);
    writeIndexFile(index);
    
    console.log('[ModuleIndexBuilder] ✓ Генерация index.json успешно завершена');
  } catch (error) {
    console.error('[ModuleIndexBuilder] ✗ Ошибка генерации index.json:', error);
    process.exit(1);
  }
}

// Запуск генерации если скрипт вызван напрямую
if (require.main === module) {
  generateIndex();
}

// Экспорт для использования в других скриптах
module.exports = { generateIndex, scanModules, generateIndexContent, writeIndexFile, loadPreviousIndex, reportModuleChanges };