// Данные панели управления
// Содержит методы для загрузки и отображения данных панели управления

/**
 * Загрузка данных для панели управления
 * @param {Object} app Экземпляр приложения
 */
export function loadDashboardData(app) {
    // Загрузка данных для панели управления
    const db = new Database();
    
    // Получаем статистику
    Promise.all([
        db.getOrders({ status: 'active' }),
        db.getOrders({ status: 'in_production' }),
        db.getOrders({ status: 'ready_to_ship' }),
        db.getTasks({ priority: 'critical' })
    ]).then(([activeOrders, inProduction, readyToShip, criticalTasks]) => {
        const activeOrdersEl = document.getElementById('active-orders-count');
        const inProductionEl = document.getElementById('in-production-count');
        const readyToShipEl = document.getElementById('ready-to-ship-count');
        const criticalTasksEl = document.getElementById('critical-tasks-count');
        
        if (activeOrdersEl) activeOrdersEl.textContent = activeOrders.length;
        if (inProductionEl) inProductionEl.textContent = inProduction.length;
        if (readyToShipEl) readyToShipEl.textContent = readyToShip.length;
        if (criticalTasksEl) criticalTasksEl.textContent = criticalTasks.length;
    }).catch(error => {
        console.error('Ошибка загрузки данных панели управления:', error);
    });
}