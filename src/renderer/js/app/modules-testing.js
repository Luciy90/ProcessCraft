// Тестирование модулей
// Содержит методы для тестирования функциональности модулей

/**
 * Тестирование переключения модулей
 * @param {Object} app Экземпляр приложения
 */
export function testModuleSwitching(app) {
    console.debug('Тестирование переключения модулей...');
    console.debug('Доступные модули:', Object.keys(app.modules));
    
    // Динамически проверяем загруженные модули
    const loadedModules = Object.keys(app.modules);
    console.debug(`Проверка ${loadedModules.length} загруженных модулей:`);
    
    loadedModules.forEach(moduleName => {
        const container = document.getElementById(`${moduleName}-module`);
        const navItem = document.querySelector(`[data-module="${moduleName}"]`);
        
        if (!container) {
            console.warn(`⚠ Контейнер для модуля "${moduleName}" не найден в DOM`);
        }
        if (!navItem) {
            console.warn(`⚠ Навигационный элемент для модуля "${moduleName}" не найден`);
        }
        
    console.debug(`Модуль ${moduleName}:`, {
            container: !!container,
            navItem: !!navItem,
            moduleInstance: !!app.modules[moduleName],
            initialized: !!app.modules[moduleName]?._initialized
        });
    });
    
    // Добавляем глобальную функцию для тестирования
    window.testSwitchModule = (moduleName) => {
    console.debug('Тестовое переключение на модуль:', moduleName);
        app.switchModule(moduleName).catch(error => console.error(`Error switching to module ${moduleName}:`, error));
    };
    
    console.debug('Для тестирования используйте: testSwitchModule("orders")');
    
    // Тестирование иконок
    window.testIcons = () => {
        console.debug('Тестирование иконок...');
        if (window.lucide) {
            console.debug('Lucide доступен:', window.lucide);
            try {
                window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
                console.debug('Иконки созданы успешно');
            } catch (error) {
                console.error('Ошибка создания иконок:', error);
            }
        } else {
            console.error('Lucide недоступен');
        }
    };
    
    console.debug('Для тестирования иконок используйте: testIcons()');
}