/**
 * ДИНАМИЧЕСКИЙ ЗАГРУЗЧИК МОДУЛЕЙ ProcessCraft
 * 
 * Автоматически находит, валидирует и загружает модули из указанной директории.
 * Поддерживает как Electron, так и браузерное окружение с fallback механизмами.
 * 
 * @author ProcessCraft Team
 * @version 1.0.0
 */

// Глобальные реестры модулей
window.moduleRegistry = window.moduleRegistry || new Map();
window.moduleMeta = window.moduleMeta || new Map();

/**
 * Основной класс загрузчика модулей
 */
class ModuleLoader {
    constructor(options = {}) {
        this.options = {
            path: options.path || 'js/modules',
            dev: options.dev || false,
            lazyLoad: options.lazyLoad || false,
            ...options
        };
        
        this.isElectron = typeof window.require !== 'undefined';
        this.loadedModules = new Set();
        this.errors = [];
        
        // Настройка логирования
        this.log = this.options.dev ? console.log.bind(console, '[ModuleLoader]') : () => {};
        this.warn = console.warn.bind(console, '[ModuleLoader]');
        this.error = console.error.bind(console, '[ModuleLoader]');
        
        this.log('Инициализация загрузчика модулей', this.options);
    }

    /**
     * Основная функция загрузки модулей
     * @returns {Promise<Object>} Результат загрузки с информацией о модулях
     */
    async loadModules() {
        try {
            this.log('Начало загрузки модулей из:', this.options.path);
            
            // Сканирование каталога модулей
            const moduleFiles = await this.scanModuleDirectory();
            this.log('Найдено модульных файлов:', moduleFiles.length);
            
            // Загрузка и регистрация модулей
            const loadResults = await this.loadAndRegisterModules(moduleFiles);
            
            // Инициализация модулей (если не lazy load)
            if (!this.options.lazyLoad) {
                await this.initAllModules();
            }
            
            // Настройка hot-reload для dev режима
            if (this.options.dev && this.isElectron) {
                this.setupHotReload();
            }
            
            // Отправка события о завершении загрузки
            this.dispatchLoadEvent(loadResults);
            
            this.log('Загрузка модулей завершена успешно');
            
            return {
                success: true,
                loaded: loadResults.success,
                failed: loadResults.failed,
                total: moduleFiles.length,
                registry: window.moduleRegistry,
                meta: window.moduleMeta
            };
            
        } catch (error) {
            this.error('Критическая ошибка при загрузке модулей:', error);
            return {
                success: false,
                error: error.message,
                loaded: [],
                failed: [],
                total: 0
            };
        }
    }

    /**
     * Сканирование директории модулей
     * @returns {Promise<Array>} Список найденных файлов модулей
     */
    async scanModuleDirectory() {
        if (this.isElectron) {
            return await this.scanElectronDirectory();
        } else {
            return await this.scanBrowserDirectory();
        }
    }

    /**
     * Сканирование в Electron окружении
     * @returns {Promise<Array>} Список файлов модулей
     */
    async scanElectronDirectory() {
        try {
            // Проверяем доступность IPC API
            if (window.electronAPI && window.electronAPI.readDir) {
                return await this.scanViaIPC();
            }
            
            // Fallback на require fs (если context isolation отключен)
            const fs = window.require('fs');
            const path = window.require('path');
            
            const modulesPath = path.join(process.cwd(), 'src/renderer', this.options.path);
            this.log('Сканирование Electron директории:', modulesPath);
            
            const files = fs.readdirSync(modulesPath);
            const moduleFiles = files
                .filter(file => file.endsWith('.js') && !file.includes('..'))
                .map(file => ({
                    name: file,
                    path: `${this.options.path}/${file}`,
                    fullPath: path.join(modulesPath, file)
                }));
                
            this.log('Найдено файлов через fs:', moduleFiles.length);
            return moduleFiles;
            
        } catch (error) {
            this.warn('Ошибка сканирования Electron директории:', error);
            // Fallback на браузерный режим
            return await this.scanBrowserDirectory();
        }
    }

    /**
     * Сканирование через IPC (безопасный режим)
     * @returns {Promise<Array>} Список файлов модулей
     */
    async scanViaIPC() {
        try {
            this.log('Сканирование через IPC API');
            const result = await window.electronAPI.readDir(this.options.path);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            const moduleFiles = result.files
                .filter(file => file.endsWith('.js') && !file.includes('..'))
                .map(file => ({
                    name: file,
                    path: `${this.options.path}/${file}`,
                    fullPath: file
                }));
                
            this.log('Найдено файлов через IPC:', moduleFiles.length);
            return moduleFiles;
            
        } catch (error) {
            this.warn('Ошибка IPC сканирования:', error);
            throw error;
        }
    }

    /**
     * Сканирование в браузерном окружении
     * @returns {Promise<Array>} Список файлов модулей из index.json
     */
    async scanBrowserDirectory() {
        try {
            this.log('Сканирование браузерной директории via index.json');
            
            // Попытка загрузить modules/index.json
            const indexUrl = `${this.options.path}/index.json`;
            const response = await fetch(indexUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const index = await response.json();
            const moduleFiles = (index.modules || [])
                .filter(file => file.endsWith('.js') && !file.includes('..'))
                .map(file => ({
                    name: file,
                    path: `${this.options.path}/${file}`,
                    fullPath: file
                }));
                
            this.log('Найдено файлов через index.json:', moduleFiles.length);
            return moduleFiles;
            
        } catch (error) {
            this.warn('Ошибка загрузки index.json:', error);
            
            // Последний fallback - известные модули
            this.log('Fallback на предопределенный список модулей');
            const knownModules = [
                'dashboard.js', 'orders.js', 'design.js', 'technology.js',
                'warehouse.js', 'molds.js', 'maintenance.js', 'production.js', 'analytics.js'
            ];
            
            return knownModules.map(file => ({
                name: file,
                path: `${this.options.path}/${file}`,
                fullPath: file
            }));
        }
    }

    /**
     * Загрузка и регистрация найденных модулей
     * @param {Array} moduleFiles Список файлов для загрузки
     * @returns {Promise<Object>} Результаты загрузки
     */
    async loadAndRegisterModules(moduleFiles) {
        const results = { success: [], failed: [] };
        
        for (const file of moduleFiles) {
            try {
                const moduleInfo = await this.loadSingleModule(file);
                if (moduleInfo) {
                    results.success.push(moduleInfo);
                    this.log(`✓ Модуль загружен: ${moduleInfo.id}`);
                } else {
                    results.failed.push({ file: file.name, error: 'Модуль не возвращен' });
                }
            } catch (error) {
                this.error(`✗ Ошибка загрузки модуля ${file.name}:`, error);
                results.failed.push({ file: file.name, error: error.message });
            }
        }
        
        this.log(`Загрузка завершена: ${results.success.length} успешно, ${results.failed.length} с ошибками`);
        return results;
    }

    /**
     * Загрузка одного модуля
     * @param {Object} file Информация о файле модуля
     * @returns {Promise<Object|null>} Информация о загруженном модуле
     */
    async loadSingleModule(file) {
        const moduleId = this.extractModuleId(file.name);
        
        // Валидация moduleId
        if (!this.validateModuleId(moduleId)) {
            throw new Error(`Недопустимый moduleId: ${moduleId}`);
        }
        
        // Проверка дублирования
        if (this.loadedModules.has(moduleId)) {
            this.warn(`Модуль ${moduleId} уже загружен, пропускаем`);
            return null;
        }
        
        // Загрузка метаданных
        const meta = await this.loadModuleMeta(file, moduleId);
        
        // Динамический импорт модуля
        const ModuleClass = await this.importModule(file);
        
        if (!ModuleClass) {
            throw new Error('Модуль не экспортирует класс');
        }
        
        // Создание экземпляра модуля
        const instance = this.createModuleInstance(ModuleClass, moduleId, meta);
        
        // Регистрация в реестре
        const moduleInfo = {
            id: moduleId,
            meta: meta,
            instance: instance,
            moduleClass: ModuleClass,
            status: 'registered',
            file: file.name
        };
        
        window.moduleRegistry.set(moduleId, moduleInfo);
        window.moduleMeta.set(moduleId, meta);
        this.loadedModules.add(moduleId);
        
        return moduleInfo;
    }

    /**
     * Извлечение moduleId из имени файла
     * @param {string} filename Имя файла
     * @returns {string} ID модуля
     */
    extractModuleId(filename) {
        return filename.replace(/\.js$/, '').toLowerCase();
    }

    /**
     * Валидация moduleId по безопасности
     * @param {string} moduleId ID модуля для проверки
     * @returns {boolean} Результат валидации
     */
    validateModuleId(moduleId) {
        // Разрешены только a-z, 0-9, дефис и подчеркивание
        const safePattern = /^[a-z0-9-_]+$/;
        const isValid = safePattern.test(moduleId) && !moduleId.includes('..');
        
        if (!isValid) {
            this.error(`Небезопасный moduleId: ${moduleId}`);
        }
        
        return isValid;
    }

    /**
     * Загрузка метаданных модуля
     * @param {Object} file Информация о файле
     * @param {string} moduleId ID модуля
     * @returns {Promise<Object>} Метаданные модуля
     */
    async loadModuleMeta(file, moduleId) {
        // Попытка загрузить .meta.json файл
        try {
            const metaPath = file.path.replace('.js', '.meta.json');
            const response = await fetch(metaPath);
            
            if (response.ok) {
                const meta = await response.json();
                this.log(`Загружены метаданные из ${metaPath}:`, meta);
                return this.validateMeta(meta, moduleId);
            }
        } catch (error) {
            this.log(`Метаданные ${moduleId}.meta.json не найдены:`, error.message);
        }
        
        // Fallback на дефолтные метаданные
        return this.getDefaultMeta(moduleId);
    }

    /**
     * Валидация и нормализация метаданных
     * @param {Object} meta Сырые метаданные
     * @param {string} moduleId ID модуля
     * @returns {Object} Валидные метаданные
     */
    validateMeta(meta, moduleId) {
        return {
            moduleId: meta.moduleId || moduleId,
            moduleName: meta.moduleName || moduleId,
            version: meta.version || '1.0.0',
            description: meta.description || '',
            dependencies: Array.isArray(meta.dependencies) ? meta.dependencies : [],
            author: meta.author || '',
            enabled: meta.enabled !== false // по умолчанию true
        };
    }

    /**
     * Получение метаданных по умолчанию
     * @param {string} moduleId ID модуля
     * @returns {Object} Дефолтные метаданные
     */
    getDefaultMeta(moduleId) {
        // Попытка получить читаемое имя из UI_CONFIG
        let moduleName = moduleId;
        if (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.modules) {
            moduleName = window.UI_CONFIG.texts.modules[moduleId] || moduleId;
        }
        
        return {
            moduleId: moduleId,
            moduleName: moduleName,
            version: '1.0.0',
            description: `Модуль ${moduleName}`,
            dependencies: [],
            author: 'ProcessCraft',
            enabled: true
        };
    }

    /**
     * Динамический импорт модуля
     * @param {Object} file Информация о файле
     * @returns {Promise<Function>} Класс модуля
     */
    async importModule(file) {
        try {
            // Попытка ES6 динамического импорта
            this.log(`Импорт модуля: ${file.path}`);
            
            // Формируем правильный путь для импорта
            let importPath = file.path;
            
            // Убираем дублирование путей
            if (importPath.startsWith('js/modules/')) {
                importPath = importPath.replace('js/', '');
            }
            
            // Для Electron нужно использовать относительный путь от текущего файла
            if (!importPath.startsWith('./') && !importPath.startsWith('/')) {
                importPath = './' + importPath;
            }
            
            this.log(`Попытка импорта: ${importPath}`);
            const module = await import(importPath);
            
            // Поиск экспортированного класса
            const ModuleClass = this.findModuleClass(module, file.name);
            if (ModuleClass) {
                return ModuleClass;
            }
            
        } catch (error) {
            this.warn(`ES6 импорт неудачен для ${file.name}:`, error);
        }
        
        // Fallback на глобальные переменные (для совместимости)
        return this.findGlobalModuleClass(file.name);
    }

    /**
     * Поиск класса модуля в импортированном объекте
     * @param {Object} module Импортированный модуль
     * @param {string} filename Имя файла
     * @returns {Function|null} Найденный класс
     */
    findModuleClass(module, filename) {
        // Поиск дефолтного экспорта
        if (module.default && typeof module.default === 'function') {
            return module.default;
        }
        
        // Поиск именованного экспорта по имени файла
        const className = this.getExpectedClassName(filename);
        if (module[className] && typeof module[className] === 'function') {
            return module[className];
        }
        
        // Поиск первой функции-конструктора
        for (const [key, value] of Object.entries(module)) {
            if (typeof value === 'function' && value.prototype) {
                this.log(`Найден класс модуля: ${key}`);
                return value;
            }
        }
        
        return null;
    }

    /**
     * Получение ожидаемого имени класса по имени файла
     * @param {string} filename Имя файла
     * @returns {string} Ожидаемое имя класса
     */
    getExpectedClassName(filename) {
        const baseName = filename.replace(/\.js$/, '');
        return baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Module';
    }

    /**
     * Поиск класса модуля в глобальной области видимости
     * @param {string} filename Имя файла
     * @returns {Function|null} Найденный класс
     */
    findGlobalModuleClass(filename) {
        const className = this.getExpectedClassName(filename);
        
        if (window[className] && typeof window[className] === 'function') {
            this.log(`Найден глобальный класс: ${className}`);
            return window[className];
        }
        
        this.warn(`Класс ${className} не найден в глобальной области`);
        return null;
    }

    /**
     * Создание экземпляра модуля
     * @param {Function} ModuleClass Класс модуля
     * @param {string} moduleId ID модуля
     * @param {Object} meta Метаданные модуля
     * @returns {Object} Экземпляр модуля
     */
    createModuleInstance(ModuleClass, moduleId, meta) {
        try {
            const instance = new ModuleClass({
                moduleId: moduleId,
                meta: meta,
                loader: this
            });
            
            // Валидация интерфейса модуля
            this.validateModuleInterface(instance, moduleId);
            
            return instance;
            
        } catch (error) {
            this.error(`Ошибка создания экземпляра модуля ${moduleId}:`, error);
            throw error;
        }
    }

    /**
     * Валидация интерфейса модуля
     * @param {Object} instance Экземпляр модуля
     * @param {string} moduleId ID модуля
     */
    validateModuleInterface(instance, moduleId) {
        const requiredMethods = ['init'];
        const optionalMethods = ['render', 'setupEventListeners', 'destroy'];
        
        for (const method of requiredMethods) {
            if (typeof instance[method] !== 'function') {
                throw new Error(`Модуль ${moduleId} должен иметь метод ${method}()`);
            }
        }
        
        for (const method of optionalMethods) {
            if (instance[method] && typeof instance[method] !== 'function') {
                this.warn(`Модуль ${moduleId}: ${method} должен быть функцией`);
            }
        }
    }

    /**
     * Инициализация всех загруженных модулей
     * @returns {Promise<void>}
     */
    async initAllModules() {
        this.log('Инициализация всех модулей...');
        
        for (const [moduleId, moduleInfo] of window.moduleRegistry) {
            if (moduleInfo.meta.enabled) {
                await this.initModule(moduleId);
            } else {
                this.log(`Модуль ${moduleId} отключен, пропускаем инициализацию`);
            }
        }
    }

    /**
     * Инициализация конкретного модуля
     * @param {string} moduleId ID модуля
     * @returns {Promise<boolean>} Результат инициализации
     */
    async initModule(moduleId) {
        const moduleInfo = window.moduleRegistry.get(moduleId);
        
        if (!moduleInfo) {
            this.error(`Модуль ${moduleId} не найден в реестре`);
            return false;
        }
        
        if (moduleInfo.status === 'initialized') {
            this.log(`Модуль ${moduleId} уже инициализирован`);
            return true;
        }
        
        try {
            this.log(`Инициализация модуля: ${moduleId}`);
            moduleInfo.status = 'loading';
            
            // Безопасный вызов init()
            if (typeof moduleInfo.instance.init === 'function') {
                await moduleInfo.instance.init();
            }
            
            moduleInfo.status = 'initialized';
            this.log(`✓ Модуль ${moduleId} инициализирован`);
            
            return true;
            
        } catch (error) {
            this.error(`Ошибка инициализации модуля ${moduleId}:`, error);
            moduleInfo.status = 'error';
            moduleInfo.error = error.message;
            return false;
        }
    }

    /**
     * Настройка hot-reload для dev режима (только Electron)
     */
    setupHotReload() {
        if (!this.isElectron || !this.options.dev) {
            return;
        }
        
        try {
            // Проверяем доступность chokidar
            let watcher;
            try {
                const chokidar = window.require('chokidar');
                const path = window.require('path');
                const watchPath = path.join(process.cwd(), 'src/renderer', this.options.path);
                
                watcher = chokidar.watch(watchPath, {
                    ignored: /node_modules/,
                    persistent: true
                });
                
                this.log('Hot-reload через chokidar настроен для:', watchPath);
                
            } catch (e) {
                // Fallback на fs.watch
                const fs = window.require('fs');
                const path = window.require('path');
                const watchPath = path.join(process.cwd(), 'src/renderer', this.options.path);
                
                watcher = fs.watch(watchPath, { recursive: false });
                this.log('Hot-reload через fs.watch настроен для:', watchPath);
            }
            
            watcher.on('change', (filePath) => {
                this.handleFileChange(filePath);
            });
            
        } catch (error) {
            this.warn('Не удалось настроить hot-reload:', error);
        }
    }

    /**
     * Обработка изменений файлов (hot-reload)
     * @param {string} filePath Путь к изменившемуся файлу
     */
    async handleFileChange(filePath) {
        const filename = filePath.split(/[/\\]/).pop();
        
        if (!filename.endsWith('.js')) {
            return;
        }
        
        const moduleId = this.extractModuleId(filename);
        this.log(`Обнаружено изменение файла: ${filename} (модуль: ${moduleId})`);
        
        try {
            await this.reloadModule(moduleId);
        } catch (error) {
            this.error(`Ошибка hot-reload модуля ${moduleId}:`, error);
        }
    }

    /**
     * Перезагрузка модуля (hot-reload)
     * @param {string} moduleId ID модуля для перезагрузки
     * @returns {Promise<boolean>} Результат перезагрузки
     */
    async reloadModule(moduleId) {
        const moduleInfo = window.moduleRegistry.get(moduleId);
        
        if (!moduleInfo) {
            this.warn(`Модуль ${moduleId} не найден для перезагрузки`);
            return false;
        }
        
        try {
            // Уничтожение старого экземпляра
            if (typeof moduleInfo.instance.destroy === 'function') {
                await moduleInfo.instance.destroy();
            }
            
            // Очистка кэша модуля (для браузеров с поддержкой)
            if (typeof window.location.reload === 'function') {
                // В браузере - полная перезагрузка
                this.warn('Hot-reload в браузере: рекомендуется обновить страницу');
                return false;
            }
            
            // Повторная загрузка модуля
            const file = { name: `${moduleId}.js`, path: `${this.options.path}/${moduleId}.js` };
            const newModuleInfo = await this.loadSingleModule(file);
            
            if (newModuleInfo && !this.options.lazyLoad) {
                await this.initModule(moduleId);
            }
            
            this.log(`✓ Модуль ${moduleId} успешно перезагружен`);
            return true;
            
        } catch (error) {
            this.error(`Ошибка перезагрузки модуля ${moduleId}:`, error);
            return false;
        }
    }

    /**
     * Отправка события о завершении загрузки модулей
     * @param {Object} results Результаты загрузки
     */
    dispatchLoadEvent(results) {
        const event = new CustomEvent('modules:loaded', {
            detail: {
                success: results.success,
                failed: results.failed,
                registry: window.moduleRegistry,
                meta: window.moduleMeta,
                loader: this
            }
        });
        
        document.dispatchEvent(event);
        this.log('Событие modules:loaded отправлено');
    }

    // ===== ПУБЛИЧНОЕ API =====

    /**
     * Получение информации о модуле
     * @param {string} moduleId ID модуля
     * @returns {Object|null} Информация о модуле
     */
    static getModule(moduleId) {
        return window.moduleRegistry.get(moduleId) || null;
    }

    /**
     * Получение экземпляра модуля
     * @param {string} moduleId ID модуля
     * @returns {Object|null} Экземпляр модуля
     */
    static getModuleInstance(moduleId) {
        const moduleInfo = window.moduleRegistry.get(moduleId);
        return moduleInfo ? moduleInfo.instance : null;
    }

    /**
     * Получение метаданных модуля
     * @param {string} moduleId ID модуля
     * @returns {Object|null} Метаданные модуля
     */
    static getModuleMeta(moduleId) {
        return window.moduleMeta.get(moduleId) || null;
    }

    /**
     * Получение списка всех модулей
     * @returns {Array} Список модулей с их статусами
     */
    static listModules() {
        const modules = [];
        
        for (const [moduleId, moduleInfo] of window.moduleRegistry) {
            modules.push({
                id: moduleId,
                name: moduleInfo.meta.moduleName,
                status: moduleInfo.status,
                enabled: moduleInfo.meta.enabled,
                version: moduleInfo.meta.version,
                file: moduleInfo.file
            });
        }
        
        return modules;
    }

    /**
     * Проверка доступности модуля
     * @param {string} moduleId ID модуля
     * @returns {boolean} Доступен ли модуль
     */
    static isModuleAvailable(moduleId) {
        const moduleInfo = window.moduleRegistry.get(moduleId);
        return moduleInfo && moduleInfo.status === 'initialized' && moduleInfo.meta.enabled;
    }
}

/**
 * Основная функция загрузки модулей (публичный API)
 * @param {Object} options Опции загрузки
 * @returns {Promise<Object>} Результат загрузки
 */
async function loadModules(options = {}) {
    const loader = new ModuleLoader(options);
    
    try {
        const result = await loader.loadModules();
        
        // Сохраняем ссылку на загрузчик для debug'а
        if (options.dev) {
            window.moduleLoader = loader;
        }
        
        return result;
        
    } catch (error) {
        console.error('[ModuleLoader] Критическая ошибка загрузки:', error);
        return {
            success: false,
            error: error.message,
            loaded: [],
            failed: [],
            total: 0
        };
    }
}

// Экспорт для ES6 модулей
export { loadModules, ModuleLoader };

// Глобальная доступность для совместимости
window.loadModules = loadModules;
window.ModuleLoader = ModuleLoader;

// Дополнительные утилиты в глобальной области
window.getModule = ModuleLoader.getModule;
window.getModuleInstance = ModuleLoader.getModuleInstance;
window.getModuleMeta = ModuleLoader.getModuleMeta;
window.listModules = ModuleLoader.listModules;
window.isModuleAvailable = ModuleLoader.isModuleAvailable;