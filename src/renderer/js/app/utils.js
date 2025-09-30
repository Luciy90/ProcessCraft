// Утилиты приложения
// Содержит вспомогательные методы приложения

/**
 * Показ сообщения пользователю
 * @param {Object} app Экземпляр приложения
 * @param {string} message Текст сообщения
 * @param {string} type Тип сообщения (info, error, success)
 */
export function showMessage(app, message, type = 'info') {
    // Показ сообщений пользователю
    const typesText = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.notifications && window.UI_CONFIG.texts.notifications.types) || {};
    const notification = {
        id: Date.now(),
        title: type === 'error' ? (typesText.error || 'Ошибка') : type === 'success' ? (typesText.success || 'Успешно') : (typesText.info || 'Информация'),
        message: message,
        type: type,
        createdAt: new Date().toISOString()
    };

    app.notifications.unshift(notification);
    app.updateNotificationBadge();
}

/**
 * Обновление индикатора уведомлений
 * @param {Object} app Экземпляр приложения
 */
export function updateNotificationBadge(app) {
    const unreadCount = app.notifications.filter(n => !n.read).length;
    document.getElementById('notification-count').textContent = unreadCount;
}