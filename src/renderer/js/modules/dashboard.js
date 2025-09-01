// Модуль панели управления

class DashboardModule {
    constructor() {
        this.db = new Database();
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Обновление данных каждые 30 секунд
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    async loadDashboardData() {
        try {
            const [activeOrders, inProduction, readyToShip, criticalTasks] = await Promise.all([
                this.db.getOrders({ status: 'active' }),
                this.db.getOrders({ status: 'in_production' }),
                this.db.getOrders({ status: 'ready' }),
                this.db.getTasks({ priority: 'critical' })
            ]);

            document.getElementById('active-orders-count').textContent = activeOrders.length;
            document.getElementById('in-production-count').textContent = inProduction.length;
            document.getElementById('ready-to-ship-count').textContent = readyToShip.length;
            document.getElementById('critical-tasks-count').textContent = criticalTasks.length;
        } catch (error) {
            console.error('Ошибка загрузки данных панели управления:', error);
        }
    }
}

window.DashboardModule = DashboardModule;


