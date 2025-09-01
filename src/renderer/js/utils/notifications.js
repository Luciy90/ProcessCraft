// Утилита для работы с уведомлениями

class NotificationManager {
    constructor() {
        this.db = new Database();
        this.notifications = [];
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.loadNotifications();
        this.setupAutoRefresh();
        this.isInitialized = true;
    }

    async loadNotifications() {
        try {
            this.notifications = await this.db.getNotifications();
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    }

    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    setupAutoRefresh() {
        // Обновляем уведомления каждые 30 секунд
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
    }

    async createNotification(data) {
        try {
            const notification = await this.db.createNotification({
                title: data.title,
                message: data.message,
                type: data.type || 'info',
                module: data.module,
                priority: data.priority || 'normal',
                read: false
            });

            this.notifications.unshift(notification);
            this.updateNotificationBadge();
            this.showToast(notification);

            return notification;
        } catch (error) {
            console.error('Ошибка создания уведомления:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            await this.db.updateNotification(notificationId, { read: true });
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
            }
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Ошибка обновления уведомления:', error);
        }
    }

    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.read);
            for (const notification of unreadNotifications) {
                await this.db.updateNotification(notification.id, { read: true });
                notification.read = true;
            }
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Ошибка обновления уведомлений:', error);
        }
    }

    showToast(notification) {
        // Создаем toast уведомление
        const toast = document.createElement('div');
        toast.className = `toast toast-${notification.type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${notification.title}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="toast-message">${notification.message}</div>
        `;

        // Добавляем в контейнер
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Автоматически удаляем через 5 секунд
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Утилиты для создания типовых уведомлений
    async orderStatusChanged(orderId, oldStatus, newStatus) {
        const statusNames = {
            new: 'Новый',
            confirmed: 'Подтвержден',
            in_production: 'В производстве',
            ready: 'Готов',
            shipped: 'Отгружен',
            cancelled: 'Отменен'
        };

        await this.createNotification({
            title: 'Изменение статуса заказа',
            message: `Заказ ${orderId} изменил статус с "${statusNames[oldStatus]}" на "${statusNames[newStatus]}"`,
            type: 'info',
            module: 'orders',
            priority: 'normal'
        });
    }

    async lowStockAlert(materialId, materialName, currentStock, minStock) {
        await this.createNotification({
            title: 'Низкий запас материала',
            message: `Материал "${materialName}" имеет низкий запас: ${currentStock} (минимум: ${minStock})`,
            type: 'warning',
            module: 'warehouse',
            priority: 'high'
        });
    }

    async productionCompleted(orderId, productName) {
        await this.createNotification({
            title: 'Производство завершено',
            message: `Заказ ${orderId} (${productName}) готов к отгрузке`,
            type: 'success',
            module: 'production',
            priority: 'normal'
        });
    }

    async maintenanceRequired(equipmentId, equipmentName) {
        await this.createNotification({
            title: 'Требуется обслуживание',
            message: `Оборудование "${equipmentName}" требует планового обслуживания`,
            type: 'warning',
            module: 'maintenance',
            priority: 'medium'
        });
    }

    async criticalError(message, module = 'system') {
        await this.createNotification({
            title: 'Критическая ошибка',
            message: message,
            type: 'error',
            module: module,
            priority: 'critical'
        });
    }
}

// Глобальный экземпляр менеджера уведомлений
window.notificationManager = new NotificationManager();



