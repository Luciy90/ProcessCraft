// Обработка событий загрузки модулей
// Содержит методы для работы с событиями загрузки модулей

/**
 * Обработчик события завершения загрузки модулей
 * @param {Object} app Экземпляр приложения
 * @param {Object} detail Детали события
 */
export function onModulesLoaded(app, detail) {
    console.debug('Обработка события загрузки модулей');
    
    // Обновляем навигацию с учетом загруженных модулей
    updateNavigationFromModules(app, detail.success);
    
    // Перенастраиваем обработчики навигации
    app.setupNavigationListeners();
}

/**
 * Обновление навигации на основе загруженных модулей
 * @param {Object} app Экземпляр приложения
 * @param {Array} loadedModules Массив загруженных модулей
 */
export function updateNavigationFromModules(app, loadedModules) {
    // Можно добавить логику динамического обновления навигации
    // на основе метаданных модулей
    console.debug('Обновление навигации на основе загруженных модулей:', 
        loadedModules.map(m => m.id));
}