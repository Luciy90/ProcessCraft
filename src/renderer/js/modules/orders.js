// Пример модуля с поддержкой динамической загрузки

class OrdersModule {
    constructor(options = {}) {
        // Сохраняем опции от загрузчика модулей
        this.moduleId = options.moduleId || 'orders';
        this.meta = options.meta || {};
        this.loader = options.loader || null;
        
        // Инициализация модуля
        this.db = null;
        this.currentOrder = null;
        this.filters = {
            status: '',
            customer: '',
            search: ''
        };
        
        console.log(`[${this.moduleId}] Конструктор модуля выполнен`);
    }

    /**
     * Инициализация модуля
     * Вызывается автоматически загрузчиком модулей или вручную
     */
    async init() {
        try {
            console.log(`[${this.moduleId}] Начало инициализации модуля`);
            
            // Инициализация базы данных
            await this.initDatabase();
            
            // Рендер UI модуля
            this.render();
            
            // Настройка обработчиков событий
            this.setupEventListeners();
            
            // Загрузка данных
            await this.loadData();
            
            console.log(`[${this.moduleId}] Модуль успешно инициализирован`);
            
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка инициализации:`, error);
            throw error;
        }
    }

    /**
     * Инициализация базы данных
     */
    async initDatabase() {
        try {
            // Проверяем наличие глобального экземпляра Database
            if (window.Database) {
                this.db = new window.Database();
            } else {
                // Fallback: импорт Database если доступен
                const { Database } = await import('../utils/database.js');
                this.db = new Database();
            }
            
            console.log(`[${this.moduleId}] База данных инициализирована`);
            
        } catch (error) {
            console.warn(`[${this.moduleId}] Ошибка инициализации БД:`, error);
            // Создаем заглушку для работы без БД
            this.db = {
                getOrders: () => Promise.resolve([]),
                getCustomers: () => Promise.resolve([]),
                saveOrder: () => Promise.resolve({ success: true })
            };
        }
    }

    /**
     * Рендеринг UI модуля
     */
    render() {
        const moduleElement = document.getElementById(`${this.moduleId}-module`);
        
        if (!moduleElement) {
            console.error(`[${this.moduleId}] Контейнер модуля не найден: ${this.moduleId}-module`);
            return;
        }

        // Получаем тексты из конфигурации
        const cfg = window.UI_CONFIG?.texts?.orders || {};
        const globalTexts = window.UI_CONFIG?.texts || {};
        
        moduleElement.innerHTML = `
            <div class="module-header">
                <h1>${this.meta.moduleName || 'Управление заказами'}</h1>
                <div class="module-actions">
                    <button id="new-order-btn" class="btn btn-primary">
                        <i class="icon">➕</i> ${globalTexts.buttons?.new_order || 'Новый заказ'}
                    </button>
                    <button id="export-orders-btn" class="btn btn-secondary">
                        <i class="icon">📤</i> Экспорт
                    </button>
                </div>
            </div>

            <div class="orders-filters">
                <div class="filter-group">
                    <label>${cfg.filters?.status_label || 'Статус'}:</label>
                    <select id="status-filter">
                        <option value="">Все статусы</option>
                        <option value="new">${cfg.statuses?.new || 'Новый'}</option>
                        <option value="confirmed">${cfg.statuses?.confirmed || 'Подтвержден'}</option>
                        <option value="in_production">${cfg.statuses?.in_production || 'В производстве'}</option>
                        <option value="ready">${cfg.statuses?.ready || 'Готов'}</option>
                        <option value="shipped">${cfg.statuses?.shipped || 'Отгружен'}</option>
                        <option value="cancelled">${cfg.statuses?.cancelled || 'Отменен'}</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>${cfg.filters?.customer_label || 'Клиент'}:</label>
                    <select id="customer-filter">
                        <option value="">Все клиенты</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Поиск:</label>
                    <input type="text" id="search-orders" placeholder="${cfg.filters?.search_placeholder || 'Поиск по номеру заказа...'}">
                </div>
            </div>

            <div class="orders-table-container">
                <table id="orders-table" class="data-table">
                    <thead>
                        <tr>
                            <th>${cfg.columns?.order_no || '№ Заказа'}</th>
                            <th>${cfg.columns?.customer || 'Клиент'}</th>
                            <th>${cfg.columns?.product || 'Продукт'}</th>
                            <th>${cfg.columns?.qty || 'Количество'}</th>
                            <th>${cfg.columns?.status || 'Статус'}</th>
                            <th>${cfg.columns?.created_at || 'Дата создания'}</th>
                            <th>${cfg.columns?.deadline || 'Срок выполнения'}</th>
                            <th>${cfg.columns?.actions || 'Действия'}</th>
                        </tr>
                    </thead>
                    <tbody id="orders-tbody">
                        <tr>
                            <td colspan="8" class="text-center">Загрузка данных...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Модальное окно для создания/редактирования заказа -->
            <div id="order-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="order-modal-title">${globalTexts.buttons?.new_order || 'Новый заказ'}</h2>
                        <button class="close-btn" data-action="close-modal">✕</button>
                    </div>
                    <form id="order-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="order-number">Номер заказа:</label>
                                <input type="text" id="order-number" required>
                            </div>
                            <div class="form-group">
                                <label for="order-date">Дата заказа:</label>
                                <input type="date" id="order-date" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customer-select">Клиент:</label>
                                <select id="customer-select" required>
                                    <option value="">Выберите клиента</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="delivery-date">Срок выполнения:</label>
                                <input type="date" id="delivery-date" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="product-name">Наименование продукта:</label>
                            <input type="text" id="product-name" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="quantity">Количество:</label>
                                <input type="number" id="quantity" min="1" required>
                            </div>
                            <div class="form-group">
                                <label for="unit-price">Цена за единицу:</label>
                                <input type="number" id="unit-price" step="0.01" min="0">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="order-description">Описание:</label>
                            <textarea id="order-description" rows="3"></textarea>
                        </div>

                        <div class="form-group">
                            <label for="order-status">Статус:</label>
                            <select id="order-status">
                                <option value="new">${cfg.statuses?.new || 'Новый'}</option>
                                <option value="confirmed">${cfg.statuses?.confirmed || 'Подтвержден'}</option>
                                <option value="in_production">${cfg.statuses?.in_production || 'В производстве'}</option>
                                <option value="ready">${cfg.statuses?.ready || 'Готов'}</option>
                                <option value="shipped">${cfg.statuses?.shipped || 'Отгружен'}</option>
                                <option value="cancelled">${cfg.statuses?.cancelled || 'Отменен'}</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">${globalTexts.buttons?.save || 'Сохранить'}</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal">${globalTexts.buttons?.cancel || 'Отмена'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        console.log(`[${this.moduleId}] UI отрендерен`);
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Кнопка создания нового заказа
        const newOrderBtn = document.getElementById('new-order-btn');
        if (newOrderBtn) {
            newOrderBtn.addEventListener('click', () => this.openOrderModal());
        }

        // Фильтры
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterOrders());
        }

        const customerFilter = document.getElementById('customer-filter');
        if (customerFilter) {
            customerFilter.addEventListener('change', () => this.filterOrders());
        }

        const searchInput = document.getElementById('search-orders');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterOrders());
        }

        // Форма заказа
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveOrder();
            });
        }

        // Экспорт
        const exportBtn = document.getElementById('export-orders-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportOrders());
        }

        // Закрытие модального окна
        document.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close-modal') {
                this.closeOrderModal();
            }
        });

        console.log(`[${this.moduleId}] Обработчики событий настроены`);
    }

    /**
     * Загрузка данных модуля
     */
    async loadData() {
        try {
            console.log(`[${this.moduleId}] Загрузка данных...`);
            
            // Загрузка заказов
            await this.loadOrders();
            
            // Загрузка списка клиентов
            await this.loadCustomers();
            
            console.log(`[${this.moduleId}] Данные загружены`);
            
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка загрузки данных:`, error);
            this.showError('Ошибка загрузки данных');
        }
    }

    /**
     * Загрузка заказов
     */
    async loadOrders() {
        try {
            const orders = await this.db.getOrders();
            this.renderOrdersTable(orders);
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка загрузки заказов:`, error);
            this.renderOrdersTable([]);
        }
    }

    /**
     * Загрузка клиентов
     */
    async loadCustomers() {
        try {
            const customers = await this.db.getCustomers();
            this.populateCustomerSelects(customers);
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка загрузки клиентов:`, error);
            this.populateCustomerSelects([]);
        }
    }

    /**
     * Рендеринг таблицы заказов
     * @param {Array} orders Массив заказов
     */
    renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        ${window.UI_CONFIG?.texts?.orders?.no_data || 'Нет заказов'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr data-order-id="${order.id}">
                <td>${order.number}</td>
                <td>${order.customer_name}</td>
                <td>${order.product_name}</td>
                <td>${order.quantity}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>${this.formatDate(order.created_at)}</td>
                <td>${this.formatDate(order.deadline)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.getModuleInstance('${this.moduleId}').editOrder('${order.id}')">
                        Редактировать
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Заполнение селектов клиентов
     * @param {Array} customers Массив клиентов
     */
    populateCustomerSelects(customers) {
        const customerFilter = document.getElementById('customer-filter');
        const customerSelect = document.getElementById('customer-select');
        
        const customerOptions = customers.map(customer => 
            `<option value="${customer.id}">${customer.name}</option>`
        ).join('');
        
        if (customerFilter) {
            customerFilter.innerHTML = '<option value="">Все клиенты</option>' + customerOptions;
        }
        
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Выберите клиента</option>' + customerOptions;
        }
    }

    /**
     * Получение текста статуса
     * @param {string} status Код статуса
     * @returns {string} Текст статуса
     */
    getStatusText(status) {
        const statuses = window.UI_CONFIG?.texts?.orders?.statuses || {};
        return statuses[status] || status;
    }

    /**
     * Форматирование даты
     * @param {string} dateString Строка даты
     * @returns {string} Форматированная дата
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Фильтрация заказов
     */
    filterOrders() {
        this.filters.status = document.getElementById('status-filter')?.value || '';
        this.filters.customer = document.getElementById('customer-filter')?.value || '';
        this.filters.search = document.getElementById('search-orders')?.value || '';
        
        console.log(`[${this.moduleId}] Применение фильтров:`, this.filters);
        
        // Здесь должна быть логика фильтрации
        // В реальном приложении перезагружаем данные с фильтрами
        this.loadOrders();
    }

    /**
     * Открытие модального окна заказа
     * @param {Object} order Данные заказа для редактирования (необязательно)
     */
    openOrderModal(order = null) {
        const modal = document.getElementById('order-modal');
        const title = document.getElementById('order-modal-title');
        
        if (!modal) return;
        
        if (order) {
            title.textContent = 'Редактирование заказа';
            this.fillOrderForm(order);
        } else {
            title.textContent = window.UI_CONFIG?.texts?.buttons?.new_order || 'Новый заказ';
            this.clearOrderForm();
        }
        
        modal.classList.remove('hidden');
        console.log(`[${this.moduleId}] Модальное окно заказа открыто`);
    }

    /**
     * Закрытие модального окна заказа
     */
    closeOrderModal() {
        const modal = document.getElementById('order-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.clearOrderForm();
        }
        console.log(`[${this.moduleId}] Модальное окно заказа закрыто`);
    }

    /**
     * Заполнение формы заказа данными
     * @param {Object} order Данные заказа
     */
    fillOrderForm(order) {
        document.getElementById('order-number').value = order.number || '';
        document.getElementById('order-date').value = order.order_date || '';
        document.getElementById('customer-select').value = order.customer_id || '';
        document.getElementById('delivery-date').value = order.deadline || '';
        document.getElementById('product-name').value = order.product_name || '';
        document.getElementById('quantity').value = order.quantity || '';
        document.getElementById('unit-price').value = order.unit_price || '';
        document.getElementById('order-description').value = order.description || '';
        document.getElementById('order-status').value = order.status || 'new';
    }

    /**
     * Очистка формы заказа
     */
    clearOrderForm() {
        const form = document.getElementById('order-form');
        if (form) {
            form.reset();
            // Устанавливаем текущую дату
            document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
        }
    }

    /**
     * Сохранение заказа
     */
    async saveOrder() {
        try {
            const formData = this.getOrderFormData();
            
            console.log(`[${this.moduleId}] Сохранение заказа:`, formData);
            
            const result = await this.db.saveOrder(formData);
            
            if (result.success) {
                this.showSuccess('Заказ сохранен успешно');
                this.closeOrderModal();
                this.loadOrders(); // Перезагружаем таблицу
            } else {
                this.showError('Ошибка сохранения заказа');
            }
            
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка сохранения заказа:`, error);
            this.showError('Ошибка сохранения заказа');
        }
    }

    /**
     * Получение данных формы заказа
     * @returns {Object} Данные формы
     */
    getOrderFormData() {
        return {
            number: document.getElementById('order-number').value,
            order_date: document.getElementById('order-date').value,
            customer_id: document.getElementById('customer-select').value,
            deadline: document.getElementById('delivery-date').value,
            product_name: document.getElementById('product-name').value,
            quantity: parseInt(document.getElementById('quantity').value) || 0,
            unit_price: parseFloat(document.getElementById('unit-price').value) || 0,
            description: document.getElementById('order-description').value,
            status: document.getElementById('order-status').value
        };
    }

    /**
     * Редактирование заказа
     * @param {string} orderId ID заказа
     */
    async editOrder(orderId) {
        try {
            const order = await this.db.getOrder(orderId);
            if (order) {
                this.openOrderModal(order);
            } else {
                this.showError('Заказ не найден');
            }
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка загрузки заказа для редактирования:`, error);
            this.showError('Ошибка загрузки заказа');
        }
    }

    /**
     * Экспорт заказов
     */
    exportOrders() {
        console.log(`[${this.moduleId}] Экспорт заказов`);
        this.showInfo('Функция экспорта будет реализована позже');
    }

    /**
     * Показ сообщения об успехе
     * @param {string} message Текст сообщения
     */
    showSuccess(message) {
        if (window.app && typeof window.app.showMessage === 'function') {
            window.app.showMessage(message, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * Показ сообщения об ошибке
     * @param {string} message Текст сообщения
     */
    showError(message) {
        if (window.app && typeof window.app.showMessage === 'function') {
            window.app.showMessage(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Показ информационного сообщения
     * @param {string} message Текст сообщения
     */
    showInfo(message) {
        if (window.app && typeof window.app.showMessage === 'function') {
            window.app.showMessage(message, 'info');
        } else {
            alert(message);
        }
    }

    /**
     * Уничтожение модуля (для hot-reload)
     * Вызывается при перезагрузке модуля
     */
    async destroy() {
        try {
            console.log(`[${this.moduleId}] Уничтожение модуля`);
            
            // Очистка обработчиков событий
            // (в реальном приложении нужно сохранять ссылки на обработчики для их удаления)
            
            // Очистка таймеров, если есть
            // clearInterval(this.someInterval);
            
            // Освобождение ресурсов
            this.db = null;
            this.currentOrder = null;
            
            console.log(`[${this.moduleId}] Модуль уничтожен`);
            
        } catch (error) {
            console.error(`[${this.moduleId}] Ошибка при уничтожении модуля:`, error);
        }
    }

    /**
     * Статические метаданные модуля (альтернатива .meta.json)
     * Используется загрузчиком если нет .meta.json файла
     */
    static get meta() {
        return {
            moduleId: 'orders',
            moduleName: 'Управление заказами',
            version: '1.0.0',
            description: 'Модуль для управления заказами клиентов',
            dependencies: ['database'],
            author: 'ProcessCraft Team',
            enabled: true
        };
    }
}

// Экспорт модуля для ES6 import
export default OrdersModule;

// Глобальная доступность для совместимости с существующим кодом
window.OrdersModule = OrdersModule;