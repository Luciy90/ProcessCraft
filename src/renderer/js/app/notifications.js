// Уведомления приложения
// Содержит методы для работы с уведомлениями

/**
 * Переключение панели уведомлений
 * @param {Object} app Экземпляр приложения
 */
export function toggleNotifications(app) {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('hidden');
    
    if (!panel.classList.contains('hidden')) {
        app.loadNotifications();
    }
}

/**
 * Загрузка уведомлений
 * @param {Object} app Экземпляр приложения
 */
export function loadNotifications(app) {
    const notificationsList = document.getElementById('notifications-list');
    const notificationCount = document.getElementById('notification-count');
    
    // Загружаем уведомления из базы данных
    const db = new Database();
    db.getNotifications({ unread: true }).then(notifications => {
        notificationCount.textContent = notifications.length;
        
        if (notifications.length === 0) {
            const emptyText = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.notifications && window.UI_CONFIG.texts.notifications.empty) || 'Нет новых уведомлений';
            notificationsList.innerHTML = `<div class="no-notifications">${emptyText}</div>`;
            return;
        }

        notificationsList.innerHTML = notifications.map(notification => `
            <div class="notification-item" data-id="${notification.id}">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <span class="notification-time">${app.formatTime(notification.createdAt)}</span>
                </div>
                <div class="notification-message">${notification.message}</div>
            </div>
        `).join('');

        // Добавляем обработчики для уведомлений
        notificationsList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.id;
                app.markNotificationAsRead(notificationId);
            });
        });
    });
}

/**
 * Пометка уведомления как прочитанного
 * @param {Object} app Экземпляр приложения
 * @param {string} notificationId ID уведомления
 */
export function markNotificationAsRead(app, notificationId) {
    const db = new Database();
    db.updateNotification(notificationId, { read: true }).then(() => {
        app.loadNotifications();
    });
}

/**
 * Форматирование времени
 * @param {Object} app Экземпляр приложения
 * @param {string} timestamp Временная метка
 * @returns {string} Отформатированное время
 */
export function formatTime(app, timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const t = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.time) || {};
    if (diff < 60000) return t.just_now || 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t.minutes_ago_suffix || ' мин назад'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t.hours_ago_suffix || ' ч назад'}`;
    return date.toLocaleDateString();
}