// Модуль панели управления - с поддержкой динамической загрузки

class DashboardModule {
    constructor(options = {}) {
        this.moduleId = options.moduleId || 'dashboard';
        this.meta = options.meta || {};
        this.loader = options.loader || null;
        
        this.db = null;
        this.refreshInterval = null;
        
        console.log(`[${this.moduleId}] Конструктор модуля выполнен`);
    }

    async init() {
        try {
            console.log(`[${this.moduleId}] Начало инициализации модуля`);
            
            await this.initDatabase();
            this.setupEventListeners();
            await this.loadDashboardData();
            
            console.log(`[${this.moduleId}] Модуль успешно инициализирован`);
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка инициализации:`, error);
            throw error;
        }
    }

    async initDatabase() {
        try {
            if (window.Database) {
                this.db = new window.Database();
            } else {
                this.db = {
                    getOrders: () => Promise.resolve([]),
                    getTasks: () => Promise.resolve([])
                };
            }
            console.log(`[${this.moduleId}] База данных инициализирована`);
        } catch (error) {
            console.warn(`[${this.moduleId}] Ошибка инициализации БД:`, error);
            this.db = {
                getOrders: () => Promise.resolve([]),
                getTasks: () => Promise.resolve([])
            };
        }
    }

    setupEventListeners() {
        // Обновление данных каждые 30 секунд
        this.refreshInterval = setInterval(() => {
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

            const activeOrdersEl = document.getElementById('active-orders-count');
            const inProductionEl = document.getElementById('in-production-count');
            const readyToShipEl = document.getElementById('ready-to-ship-count');
            const criticalTasksEl = document.getElementById('critical-tasks-count');
            
            if (activeOrdersEl) activeOrdersEl.textContent = activeOrders.length;
            if (inProductionEl) inProductionEl.textContent = inProduction.length;
            if (readyToShipEl) readyToShipEl.textContent = readyToShip.length;
            if (criticalTasksEl) criticalTasksEl.textContent = criticalTasks.length;
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка загрузки данных панели управления:`, error);
        }
    }

    async destroy() {
        try {
            console.log(`[${this.moduleId}] Уничтожение модуля`);
            
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            
            this.db = null;
            
            console.log(`[${this.moduleId}] Модуль уничтожен`);
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка при уничтожении модуля:`, error);
        }
    }

    static get meta() {
        return {
            moduleId: 'dashboard',
            moduleName: 'Панель управления',
            version: '1.0.0',
            description: 'Главная панель с KPI и общей статистикой',
            dependencies: ['database'],
            author: 'ProcessCraft Team',
            enabled: true
        };
    }
}

// Экспорт модуля для ES6 import
export default DashboardModule;

// Глобальная доступность для совместимости
window.DashboardModule = DashboardModule;


