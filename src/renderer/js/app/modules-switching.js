// Переключение модулей приложения
// Содержит методы для переключения между модулями

/**
 * Переключение на указанный модуль
 * @param {Object} app Экземпляр приложения
 * @param {string} moduleName Название модуля для переключения
 */
export async function switchModule(app, moduleName) {
    console.log('Переключение на модуль:', moduleName);
    
    try {
        // Убираем активный класс с текущего модуля
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.module-content').forEach(content => {
            content.classList.remove('active');
        });

        // Активируем новый модуль
        const navItem = document.querySelector(`[data-module="${moduleName}"]`);
        const moduleElement = document.getElementById(`${moduleName}-module`);
        
        if (!moduleElement) {
            console.error('Контейнер модуля не найден:', moduleName);
            return;
        }
        
        if (navItem) {
            navItem.classList.add('active');
        } else {
            console.warn('Элемент навигации не найден для модуля:', moduleName);
        }
        moduleElement.classList.add('active');

        // Обновляем заголовок модуля
        const cfg = window.UI_CONFIG;
        const moduleTitle = cfg.texts.modules[moduleName] || moduleName;
        const currentModuleEl = document.getElementById('current-module');
        if (currentModuleEl) {
            currentModuleEl.textContent = moduleTitle;
        }
        
        app.currentModule = moduleName;

        // Инициализируем модуль если он еще не загружен
        // Проверяем сначала динамический реестр, потом this.modules
        let moduleInstance = null;
        
        // Поиск в динамическом реестре
        if (window.getModuleInstance) {
            moduleInstance = window.getModuleInstance(moduleName);
            if (moduleInstance) {
                console.log(`Модуль ${moduleName} найден в динамическом реестре`);
            }
        }
        
        // Fallback на статический this.modules
        if (!moduleInstance && app.modules && app.modules[moduleName]) {
            moduleInstance = app.modules[moduleName];
            console.log(`Модуль ${moduleName} найден в статическом реестре`);
        }
        
        // Инициализация модуля (только если еще не инициализирован)
        if (moduleInstance && typeof moduleInstance.init === 'function') {
            // Проверяем, не инициализирован ли модуль уже
            if (!moduleInstance._initialized) {
                console.log('Инициализация модуля:', moduleName);
                try {
                    await moduleInstance.init();
                    moduleInstance._initialized = true; // Помечаем как инициализированный
                } catch (error) {
                    console.error(`Ошибка инициализации модуля ${moduleName}:`, error);
                }
            } else {
                console.log(`Модуль ${moduleName} уже инициализирован, повторная инициализация пропущена`);
            }
        } else {
            console.warn('Модуль не найден или не имеет метода init:', moduleName);
            
            // Попытка ленивой загрузки модуля
            if (window.moduleLoader && typeof window.moduleLoader.initModule === 'function') {
                console.log(`Попытка ленивой инициализации модуля: ${moduleName}`);
                window.moduleLoader.initModule(moduleName).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Ошибка при переключении модуля:', moduleName, error);
    }
}

/**
 * Получение экземпляра модуля (безопасный доступ)
 * @param {Object} app Экземпляр приложения
 * @param {string} moduleName Название модуля
 * @returns {Object|null} Экземпляр модуля или null
 */
export function getModule(app, moduleName) {
    return app.modules && app.modules[moduleName] ? app.modules[moduleName] : null;
}