// Базовая инициализация приложения ProcessCraft
// Содержит импорты, конструктор класса и основные свойства

import { generateTopBarAvatar, updateAvatarInDOM, generateAvatarHTML } from '../utils/avatarUtils.js';

/**
 * Основной класс приложения ProcessCraft
 */
class ProcessCraftApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.modules = {};
        this.notifications = [];
        // init будет вызван отдельно в app-initialization.js
    }
    
    /**
     * Обрабатывает изменение состояния аутентификации пользователя
     * @param {boolean} isAuthenticated - true если пользователь авторизован, false если нет
     */
    handleAuthStateChange(isAuthenticated) {
        if (isAuthenticated) {
            // Пользователь вошел в систему, добавляем элементы настроек
            import('./app-initialization.js').then(module => {
                if (module.addSettingsElementsForUser) {
                    module.addSettingsElementsForUser();
                }
            }).catch(error => {
                console.warn('Ошибка при добавлении элементов настроек:', error);
            });
        } else {
            // Пользователь вышел из системы, удаляем элементы настроек
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.remove();
                console.log('Модальное окно настроек удалено из DOM при выходе пользователя');
            }
            
            const sidebarSettings = document.getElementById('sidebar-settings');
            if (sidebarSettings) {
                sidebarSettings.remove();
                console.log('Кнопка настроек в сайдбаре удалена из DOM при выходе пользователя');
            }
            
            // Сбрасываем флаг инициализации настроек
            window.modelSettingsInitialized = false;
            
            // Применяем права доступа для неавторизованного пользователя
            if (this.applyAccessRules) {
                this.applyAccessRules(this);
            }
        }
    }
}

export default ProcessCraftApp;

// Глобальная доступность для совместимости
window.ProcessCraftApp = ProcessCraftApp;