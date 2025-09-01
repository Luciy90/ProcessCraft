// Модуль управления заказами

class OrdersModule {
    constructor() {
        this.db = new Database();
        this.currentOrder = null;
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.loadOrders();
    }

    render() {
        const moduleElement = document.getElementById('orders-module');
        const cfg = window.UI_CONFIG.texts.orders;
        moduleElement.innerHTML = `
            <div class="module-header">
                <h1>${window.UI_CONFIG.nav.find(n=>n.key==='orders')?.title || 'Управление заказами'}</h1>
                <div class="module-actions">
                    <button id="new-order-btn" class="btn btn-primary">
                        <i class="icon">➕</i> ${window.UI_CONFIG.texts.buttons.new_order}
                    </button>
                    <button id="export-orders-btn" class="btn btn-secondary">
                        <i class="icon">📤</i> Экспорт
                    </button>
                </div>
            </div>

            <div class="orders-filters">
                <div class="filter-group">
                    <label>${cfg.filters.status_label}:</label>
                    <select id="status-filter">
                        <option value="">Все статусы</option>
                        <option value="new">${cfg.statuses.new}</option>
                        <option value="confirmed">${cfg.statuses.confirmed}</option>
                        <option value="in_production">${cfg.statuses.in_production}</option>
                        <option value="ready">${cfg.statuses.ready}</option>
                        <option value="shipped">${cfg.statuses.shipped}</option>
                        <option value="cancelled">${cfg.statuses.cancelled}</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>${cfg.filters.customer_label}:</label>
                    <select id="customer-filter">
                        <option value="">Все клиенты</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Поиск:</label>
                    <input type="text" id="search-orders" placeholder="${cfg.filters.search_placeholder}">
                </div>
            </div>

            <div class="orders-table-container">
                <table id="orders-table" class="data-table">
                    <thead>
                        <tr>
                            <th>${cfg.columns.order_no}</th>
                            <th>${cfg.columns.customer}</th>
                            <th>${cfg.columns.product}</th>
                            <th>${cfg.columns.qty}</th>
                            <th>${cfg.columns.status}</th>
                            <th>${cfg.columns.created_at}</th>
                            <th>${cfg.columns.deadline}</th>
                            <th>${cfg.columns.actions}</th>
                        </tr>
                    </thead>
                    <tbody id="orders-tbody">
                        <!-- Заказы будут загружаться динамически -->
                    </tbody>
                </table>
            </div>

            <!-- Модальное окно для создания/редактирования заказа -->
            <div id="order-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="order-modal-title">${window.UI_CONFIG.texts.buttons.new_order}</h2>
                        <button class="close-btn" onclick="this.closeOrderModal()">✕</button>
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
                                <option value="new">${cfg.statuses.new}</option>
                                <option value="confirmed">${cfg.statuses.confirmed}</option>
                                <option value="in_production">${cfg.statuses.in_production}</option>
                                <option value="ready">${cfg.statuses.ready}</option>
                                <option value="shipped">${cfg.statuses.shipped}</option>
                                <option value="cancelled">${cfg.statuses.cancelled}</option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">${window.UI_CONFIG.texts.buttons.save}</button>
                            <button type="button" class="btn btn-secondary" onclick="this.closeOrderModal()">${window.UI_CONFIG.texts.buttons.cancel}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Кнопка создания нового заказа
        document.getElementById('new-order-btn').addEventListener('click', () => {
            this.openOrderModal();
        });

        // Фильтры
        document.getElementById('status-filter').addEventListener('change', () => {
            this.filterOrders();
        });

        document.getElementById('customer-filter').addEventListener('change', () => {
            this.filterOrders();
        });

        document.getElementById('search-orders').addEventListener('input', () => {
            this.filterOrders();
        });

        // Форма заказа
        document.getElementById('order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOrder();
        });

        // Экспорт
        document.getElementById('export-orders-btn').addEventListener('click', () => {
            this.exportOrders();
        });
    }

    async loadOrders() {
        try {
            const orders = await this.db.getOrders();
            this.renderOrdersTable(orders);
            this.loadCustomers();
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            window.app.showMessage('Ошибка загрузки заказов', 'error');
        }
    }

    async loadCustomers() {
        try {
            const customers = await this.db.getCustomers();
            const customerFilter = document.getElementById('customer-filter');
            const customerSelect = document.getElementById('customer-select');
            
            const customerOptions = customers.map(customer => 
                `<option value="${customer.id}">${customer.name}</option>`
            ).join('');
            
            customerFilter.innerHTML = '<option value="">Все клиенты</option>' + customerOptions;
            customerSelect.innerHTML = '<option value="">Выберите клиента</option>' + customerOptions;
        } catch (error) {
            console.error('Ошибка загрузки клиентов:', error);
        }
    }

    renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-tbody');
        
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="no-data">${window.UI_CONFIG.texts.orders.no_data}</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr data-order-id="${order.id}">
                <td>${order.orderNumber || order.id}</td>
                <td>${this.getCustomerName(order.customerId)}</td>
                <td>${order.productName || '-'}</td>
                <td>${order.quantity || '-'}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>${this.formatDate(order.createdAt)}</td>
                <td>${this.formatDate(order.deliveryDate)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="this.editOrder('${order.id}')" title="Редактировать">
                            <i class="icon">✏️</i>
                        </button>
                        <button class="btn-icon" onclick="this.viewOrder('${order.id}')" title="Просмотр">
                            <i class="icon">👁️</i>
                        </button>
                        <button class="btn-icon" onclick="this.deleteOrder('${order.id}')" title="Удалить">
                            <i class="icon">🗑️</i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async getCustomerName(customerId) {
        if (!customerId) return '-';
        try {
            const customers = await this.db.getCustomers({ id: customerId });
            return customers.length > 0 ? customers[0].name : '-';
        } catch (error) {
            return '-';
        }
    }

    getStatusText(status) {
        const statusMap = window.UI_CONFIG.texts.orders.statuses;
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ru-RU');
    }

    filterOrders() {
        const statusFilter = document.getElementById('status-filter').value;
        const customerFilter = document.getElementById('customer-filter').value;
        const searchFilter = document.getElementById('search-orders').value.toLowerCase();

        const rows = document.querySelectorAll('#orders-tbody tr');
        
        rows.forEach(row => {
            const status = row.querySelector('.status-badge').textContent.trim();
            const customer = row.cells[1].textContent.trim();
            const orderNumber = row.cells[0].textContent.trim();
            
            const statusMatch = !statusFilter || status === this.getStatusText(statusFilter);
            const customerMatch = !customerFilter || row.dataset.customerId === customerFilter;
            const searchMatch = !searchFilter || 
                orderNumber.toLowerCase().includes(searchFilter) ||
                customer.toLowerCase().includes(searchFilter);

            row.style.display = statusMatch && customerMatch && searchMatch ? '' : 'none';
        });
    }

    openOrderModal(orderId = null) {
        this.currentOrder = orderId;
        const modal = document.getElementById('order-modal');
        const title = document.getElementById('order-modal-title');
        
        if (orderId) {
            title.textContent = 'Редактирование заказа';
            this.loadOrderData(orderId);
        } else {
            title.textContent = 'Новый заказ';
            this.resetOrderForm();
        }
        
        modal.classList.remove('hidden');
    }

    closeOrderModal() {
        document.getElementById('order-modal').classList.add('hidden');
        this.currentOrder = null;
    }

    resetOrderForm() {
        document.getElementById('order-form').reset();
        document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
    }

    async loadOrderData(orderId) {
        try {
            const orders = await this.db.getOrders({ id: orderId });
            if (orders.length > 0) {
                const order = orders[0];
                this.fillOrderForm(order);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных заказа:', error);
        }
    }

    fillOrderForm(order) {
        document.getElementById('order-number').value = order.orderNumber || '';
        document.getElementById('order-date').value = order.orderDate || '';
        document.getElementById('customer-select').value = order.customerId || '';
        document.getElementById('delivery-date').value = order.deliveryDate || '';
        document.getElementById('product-name').value = order.productName || '';
        document.getElementById('quantity').value = order.quantity || '';
        document.getElementById('unit-price').value = order.unitPrice || '';
        document.getElementById('order-description').value = order.description || '';
        document.getElementById('order-status').value = order.status || 'new';
    }

    async saveOrder() {
        const formData = this.getOrderFormData();
        
        try {
            if (this.currentOrder) {
                await this.db.updateOrder(this.currentOrder, formData);
                window.app.showMessage('Заказ обновлен', 'success');
            } else {
                await this.db.createOrder(formData);
                window.app.showMessage('Заказ создан', 'success');
            }
            
            this.closeOrderModal();
            this.loadOrders();
        } catch (error) {
            console.error('Ошибка сохранения заказа:', error);
            window.app.showMessage('Ошибка сохранения заказа', 'error');
        }
    }

    getOrderFormData() {
        return {
            orderNumber: document.getElementById('order-number').value,
            orderDate: document.getElementById('order-date').value,
            customerId: document.getElementById('customer-select').value,
            deliveryDate: document.getElementById('delivery-date').value,
            productName: document.getElementById('product-name').value,
            quantity: parseInt(document.getElementById('quantity').value),
            unitPrice: parseFloat(document.getElementById('unit-price').value) || 0,
            description: document.getElementById('order-description').value,
            status: document.getElementById('order-status').value
        };
    }

    async editOrder(orderId) {
        this.openOrderModal(orderId);
    }

    async viewOrder(orderId) {
        // Здесь будет логика просмотра деталей заказа
        console.log('Просмотр заказа:', orderId);
    }

    async deleteOrder(orderId) {
        if (confirm('Вы уверены, что хотите удалить этот заказ?')) {
            try {
                await this.db.deleteOrder(orderId);
                window.app.showMessage('Заказ удален', 'success');
                this.loadOrders();
            } catch (error) {
                console.error('Ошибка удаления заказа:', error);
                window.app.showMessage('Ошибка удаления заказа', 'error');
            }
        }
    }

    async exportOrders() {
        try {
            const exportPath = await this.db.exportData('orders', 'json');
            window.app.showMessage(`Данные экспортированы в: ${exportPath}`, 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            window.app.showMessage('Ошибка экспорта данных', 'error');
        }
    }
}

// Экспорт для использования в основном приложении
window.OrdersModule = OrdersModule;

