// Вспомогательные функции для управления доступом в приложении ProcessCraft
// Этот файл служит точкой подключения новой системы контроля доступа

/**
 * Инициализация системы контроля доступа
 * @param {Object} app - Экземпляр приложения ProcessCraftApp
 */
function initializeAccessControl(app) {
    // Проверяем, что метод существует в основном приложении
    if (app && typeof app.initializeAccessControl === 'function') {
        return app.initializeAccessControl();
    } else {
        console.warn('Метод initializeAccessControl не найден в приложении');
        return Promise.resolve();
    }
}

/**
 * Применение правил доступа
 * @param {Object} app - Экземпляр приложения ProcessCraftApp
 */
function applyAccessRules(app) {
    // Проверяем, что метод существует в основном приложении
    if (app && typeof app.applyAccessRules === 'function') {
        return app.applyAccessRules();
    } else {
        console.warn('Метод applyAccessRules не найден в приложении');
        return Promise.resolve();
    }
}

/**
 * Обновление маркеров доступа
 * @param {Object} app - Экземпляр приложения ProcessCraftApp
 */
function updateAccessMarkers(app) {
    // Проверяем, что метод существует в основном приложении
    if (app && typeof app.updateAccessMarkers === 'function') {
        return app.updateAccessMarkers();
    } else {
        console.warn('Метод updateAccessMarkers не найден в приложении');
        return Promise.resolve();
    }
}

/**
 * Установка текущего пользователя
 * @param {Object} app - Экземпляр приложения ProcessCraftApp
 * @param {Object} user - Объект пользователя
 */
// Avoid defining a global 'setCurrentUser' which may collide with other modules (UserStore).
// Use a namespaced function instead.
function appSetCurrentUser(app, user) {
    // Проверяем, что метод существует в основном приложении
    if (app && typeof app.setCurrentUser === 'function') {
        return app.setCurrentUser(user);
    } else {
        console.warn('Метод setCurrentUser не найден в приложении (appSetCurrentUser)');
        return Promise.resolve();
    }
}

/**
 * Проверка доступа к элементу
 * @param {string} marker - Маркер доступа
 * @returns {boolean} - Результат проверки доступа
 */
function checkAccess(marker) {
    // Получаем текущего пользователя из глобального объекта приложения
    const app = window.ProcessCraftAppInstance;
    
    // Если приложение не инициализировано, разрешаем доступ
    if (!app) {
        console.warn('Приложение не инициализировано, доступ разрешен по умолчанию');
        return true;
    }
    
    // Проверяем, что метод существует в основном приложении
    if (typeof app.checkAccess === 'function') {
        return app.checkAccess(marker);
    } else {
        console.warn('Метод checkAccess не найден в приложении, доступ разрешен по умолчанию');
        return true;
    }
}

// Функции-заглушки для совместимости со старым кодом
function initAccessControl() {
    console.warn('initAccessControl: Используется устаревшая функция, используйте initializeAccessControl(app)');
    const app = window.ProcessCraftAppInstance;
    return initializeAccessControl(app);
}

function applyAccessControl() {
    console.warn('applyAccessControl: Используется устаревшая функция, используйте applyAccessRules(app)');
    const app = window.ProcessCraftAppInstance;
    return applyAccessRules(app);
}

function updateAccessControlMarkers() {
    console.warn('updateAccessControlMarkers: Используется устаревшая функция, используйте updateAccessMarkers(app)');
    const app = window.ProcessCraftAppInstance;
    return updateAccessMarkers(app);
}

// Делаем функции доступными глобально
window.initializeAccessControl = initializeAccessControl;
window.applyAccessRules = applyAccessRules;
window.updateAccessMarkers = updateAccessMarkers;
// Do NOT expose a bare window.setCurrentUser to avoid clobbering other global functions (UserStore).
window.checkAccess = checkAccess;
window.initAccessControl = initAccessControl;
window.applyAccessControl = applyAccessControl;
window.updateAccessControlMarkers = updateAccessControlMarkers;

// Экспортируем все функции как объект для обратной совместимости
window.AppAccess = {
    initializeAccessControl,
    applyAccessRules,
    updateAccessMarkers,
    // Expose namespaced setter so callers can explicitly choose AppAccess.setCurrentUser(app, user)
    setCurrentUser: appSetCurrentUser,
    checkAccess,
    initAccessControl,
    applyAccessControl,
    updateAccessControlMarkers
};

console.log('[AppAccess] Вспомогательные функции для управления доступом загружены');