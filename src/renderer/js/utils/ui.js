// Утилита для работы с UI компонентами

class UIManager {
    constructor() {
        this.modals = new Map();
        this.loadingStates = new Map();
    }

    // Управление модальными окнами
    showModal(id, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;
        
        modal.innerHTML = `
            <div class="modal-content ${options.size || 'medium'}">
                <div class="modal-header">
                    <h2>${options.title || ''}</h2>
                    <button class="close-btn" onclick="uiManager.closeModal('${id}')">✕</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.modals.set(id, modal);

        // Анимация появления
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        return modal;
    }

    closeModal(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                this.modals.delete(id);
            }, 300);
        }
    }

    // Управление состоянием загрузки
    showLoading(elementId, message = 'Загрузка...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;

        element.style.position = 'relative';
        element.appendChild(loadingOverlay);
        this.loadingStates.set(elementId, loadingOverlay);
    }

    hideLoading(elementId) {
        const loadingOverlay = this.loadingStates.get(elementId);
        if (loadingOverlay) {
            loadingOverlay.remove();
            this.loadingStates.delete(elementId);
        }
    }

    // Показ сообщений
    showMessage(message, type = 'info', duration = 5000) {
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <span class="message-icon">${this.getMessageIcon(type)}</span>
                <span class="message-text">${message}</span>
                <button class="message-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;

        // Добавляем в контейнер
        let container = document.getElementById('message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'message-container';
            container.className = 'message-container';
            document.body.appendChild(container);
        }

        container.appendChild(messageElement);

        // Анимация появления
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 10);

        // Автоматическое удаление
        if (duration > 0) {
            setTimeout(() => {
                messageElement.classList.remove('show');
                setTimeout(() => {
                    if (messageElement.parentElement) {
                        messageElement.remove();
                    }
                }, 300);
            }, duration);
        }
    }

    getMessageIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Управление таблицами
    createDataTable(containerId, data, columns, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title;
            if (column.sortable) {
                th.className = 'sortable';
                th.onclick = () => this.sortTable(table, column.key);
            }
            headerRow.appendChild(th);
        });
        
        if (options.actions) {
            const actionTh = document.createElement('th');
            actionTh.textContent = 'Действия';
            headerRow.appendChild(actionTh);
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Тело таблицы
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.dataset.id = row.id;
            
            columns.forEach(column => {
                const td = document.createElement('td');
                if (column.render) {
                    td.innerHTML = column.render(row[column.key], row);
                } else {
                    td.textContent = row[column.key] || '';
                }
                tr.appendChild(td);
            });
            
            if (options.actions) {
                const actionTd = document.createElement('td');
                actionTd.className = 'table-actions';
                actionTd.innerHTML = this.renderTableActions(row, options.actions);
                tr.appendChild(actionTd);
            }
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);

        return table;
    }

    renderTableActions(row, actions) {
        return actions.map(action => {
            const button = document.createElement('button');
            button.className = `btn-icon ${action.class || ''}`;
            button.innerHTML = `<i class="icon">${action.icon}</i>`;
            button.title = action.title;
            button.onclick = () => action.onClick(row);
            return button.outerHTML;
        }).join('');
    }

    sortTable(table, key) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aValue = a.querySelector(`td[data-key="${key}"]`)?.textContent || '';
            const bValue = b.querySelector(`td[data-key="${key}"]`)?.textContent || '';
            return aValue.localeCompare(bValue);
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }

    // Управление формами
    createForm(containerId, fields, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const form = document.createElement('form');
        form.id = options.formId || 'dynamic-form';
        
        fields.forEach(field => {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.textContent = field.label;
            if (field.required) {
                label.innerHTML += ' <span class="required">*</span>';
            }
            fieldGroup.appendChild(label);
            
            const input = this.createFormInput(field);
            fieldGroup.appendChild(input);
            
            form.appendChild(fieldGroup);
        });
        
        if (options.actions) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'form-actions';
            actionsDiv.innerHTML = options.actions.map(action => 
                `<button type="${action.type || 'button'}" class="btn btn-${action.class || 'primary'}">${action.text}</button>`
            ).join('');
            form.appendChild(actionsDiv);
        }
        
        container.innerHTML = '';
        container.appendChild(form);
        
        return form;
    }

    createFormInput(field) {
        let input;
        
        switch (field.type) {
            case 'textarea':
                input = document.createElement('textarea');
                input.rows = field.rows || 3;
                break;
            case 'select':
                input = document.createElement('select');
                field.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    input.appendChild(optionElement);
                });
                break;
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                break;
            default:
                input = document.createElement('input');
                input.type = field.type || 'text';
        }
        
        input.id = field.id;
        input.name = field.name;
        input.required = field.required || false;
        input.placeholder = field.placeholder || '';
        input.value = field.value || '';
        
        if (field.attributes) {
            Object.entries(field.attributes).forEach(([key, value]) => {
                input.setAttribute(key, value);
            });
        }
        
        return input;
    }

    // Утилиты для работы с данными
    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ru-RU');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('ru-RU');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(amount);
    }

    // Управление состоянием приложения
    setAppState(key, value) {
        localStorage.setItem(`app_state_${key}`, JSON.stringify(value));
    }

    getAppState(key, defaultValue = null) {
        const stored = localStorage.getItem(`app_state_${key}`);
        return stored ? JSON.parse(stored) : defaultValue;
    }

    // Управление темой
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.setAppState('theme', theme);
    }

    getTheme() {
        return this.getAppState('theme', 'light');
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// Глобальный экземпляр UI менеджера
window.uiManager = new UIManager();



