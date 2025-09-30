// Управление событиями приложения
// Содержит методы для настройки и обработки событий

/**
 * Настройка обработчиков событий
 * @param {Object} app Экземпляр приложения
 */
export function setupEventListeners(app) {
    // Навигация по модулям
    app.setupNavigationListeners();
    
    // Уведомления
    document.getElementById('notifications-btn').addEventListener('click', () => {
        app.toggleNotifications();
    });

    document.getElementById('close-notifications').addEventListener('click', () => {
        app.toggleNotifications();
    });

    // Настройки
    document.getElementById('settings-btn').addEventListener('click', () => {
        app.openSettings();
    });

    // Кнопка пользователя (аватар)
    const userBtn = document.getElementById('user-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const current = window.UserStore?.getCurrentUser();
            if (!current) app.openLoginModal(); else app.openProfilePage();
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            app.openLoginModal();
        });
    }
    
    // первичный рендер
    app.updateUserInterface();

    // Модальные окна
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            app.closeModal();
        }
    });

    // Обработка меню приложения
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('menu-new-order', () => {
        app.switchModule('orders').catch(error => console.error('Error switching to orders:', error));
        // Здесь будет логика создания нового заказа
    });

    ipcRenderer.on('menu-open', () => {
        app.openFile();
    });
}

/**
 * Настройка обработчиков навигации
 * @param {Object} app Экземпляр приложения
 */
export function setupNavigationListeners(app) {
    // Удаляем старые обработчики
    document.querySelectorAll('.nav-item').forEach(item => {
        item.removeEventListener('click', app.handleNavigationClick);
    });
    
    // Добавляем новые обработчики
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', app.handleNavigationClick.bind(app));
    });
}

/**
 * Обработка клика по навигации
 * @param {Object} app Экземпляр приложения
 * @param {Event} e Событие клика
 */
export function handleNavigationClick(app, e) {
    e.preventDefault();
    const moduleName = e.currentTarget.dataset.module;
    console.log('Клик по навигации:', moduleName);
    app.switchModule(moduleName).catch(error => console.error(`Error switching to module ${moduleName}:`, error));
}