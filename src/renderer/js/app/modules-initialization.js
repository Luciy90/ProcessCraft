// Инициализация модулей приложения
// Содержит методы для загрузки и инициализации модулей

/**
 * Инициализация модулей
 * @param {Object} app Экземпляр приложения
 */
export async function initializeModules(app) {
    try {
    console.debug('Запуск динамической загрузки модулей...');
        
        // Динамическая загрузка модулей
        const loadResult = await window.loadModules({
            path: 'js/modules',
            dev: true, // включаем dev режим для отладки
            lazyLoad: false // инициализируем модули сразу
        });
        
        if (loadResult.success) {
            console.debug('✓ Динамическая загрузка модулей завершена успешно');
            console.debug(`Загружено модулей: ${loadResult.loaded.length}/${loadResult.total}`);
            
            // Создаем совместимый объект this.modules для существующего кода
            app.modules = {};
            for (const moduleInfo of loadResult.loaded) {
                app.modules[moduleInfo.id] = moduleInfo.instance;
            }
            
            // Делаем модули доступными глобально через window.app.modules
            window.app.modules = app.modules;
            
            console.debug('Доступные модули:', Object.keys(app.modules));
            
            // Логируем неудачные загрузки
            if (loadResult.failed.length > 0) {
                console.warn('Модули с ошибками загрузки:', loadResult.failed);
            }
            
        } else {
            console.error('✗ Ошибка динамической загрузки модулей:', loadResult.error);
            // Fallback на статическую инициализацию
            await initializeModulesStatic(app);
        }
        
    } catch (error) {
        console.error('Критическая ошибка инициализации модулей:', error);
        // Fallback на статическую инициализацию
        await initializeModulesStatic(app);
    }
}

/**
 * Fallback: статическая инициализация модулей (старый способ)
 * @param {Object} app Экземпляр приложения
 */
export async function initializeModulesStatic(app) {
    try {
    console.debug('Fallback: статическая инициализация модулей...');
        
        app.modules = {};
        
        // Инициализация модулей с проверкой доступности классов
        const moduleClasses = {
            dashboard: window.DashboardModule,
            orders: window.OrdersModule,
            design: window.DesignModule,
            technology: window.TechnologyModule,
            warehouse: window.WarehouseModule,
            molds: window.MoldsModule,
            maintenance: window.MaintenanceModule,
            production: window.ProductionModule,
            analytics: window.AnalyticsModule
        };
        
        for (const [moduleId, ModuleClass] of Object.entries(moduleClasses)) {
            if (ModuleClass && typeof ModuleClass === 'function') {
                try {
                    app.modules[moduleId] = new ModuleClass();
                    console.debug(`✓ Статически инициализирован модуль: ${moduleId}`);
                } catch (error) {
                    console.error(`✗ Ошибка статической инициализации модуля ${moduleId}:`, error);
                }
            } else {
                console.warn(`⚠ Класс модуля ${moduleId} не найден или недоступен`);
            }
        }
        
    console.debug('Статическая инициализация завершена. Доступные модули:', Object.keys(app.modules));
        
        // Делаем модули доступными глобально через window.app.modules
        window.app.modules = app.modules;
        
    } catch (error) {
        console.error('Ошибка статической инициализации модулей:', error);
    }
}