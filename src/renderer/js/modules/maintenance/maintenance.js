// РММ / Главный инженер

class MaintenanceModule {
    constructor() {
        this.db = new Database();
        this.currentTask = null;
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.loadTasks();
    }

    render() {
        const moduleElement = document.getElementById('maintenance-module');
        moduleElement.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-semibold text-white">РММ / Главный инженер</h1>
                        <p class="text-white/60">Задачи, ремонты, обслуживание оборудования</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="new-task-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + Новая задача
                        </button>
                        <button id="schedule-maintenance-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Планировать ТО
                        </button>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Активные задачи</div>
                        <div class="mt-2 text-2xl font-semibold text-white" id="active-tasks">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Критические</div>
                        <div class="mt-2 text-2xl font-semibold text-red-400" id="critical-tasks">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">В работе</div>
                        <div class="mt-2 text-2xl font-semibold text-amber-400" id="in-progress-tasks">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Завершено</div>
                        <div class="mt-2 text-2xl font-semibold text-green-400" id="completed-tasks">0</div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Tasks List -->
                    <div class="lg:col-span-1">
                        <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-medium text-white">Задачи РММ</h3>
                                <select id="priority-filter" class="h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-white">
                                    <option value="">Все приоритеты</option>
                                    <option value="critical">Критический</option>
                                    <option value="high">Высокий</option>
                                    <option value="medium">Средний</option>
                                    <option value="low">Низкий</option>
                                </select>
                            </div>
                            <div id="tasks-list" class="space-y-2 max-h-96 overflow-y-auto">
                                <!-- Tasks will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Task Details -->
                    <div class="lg:col-span-2">
                        <div id="task-details" class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="text-center text-white/40 py-8">
                                Выберите задачу для просмотра деталей
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Equipment Status -->
                <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                    <h3 class="text-lg font-medium text-white mb-4">Статус оборудования</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between mb-2">
                                <div class="font-medium text-white">Фрезерный станок</div>
                                <div class="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                            <div class="text-sm text-white/60">Последнее ТО: 15.01.2024</div>
                            <div class="text-sm text-white/60">Следующее ТО: 15.02.2024</div>
                        </div>
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between mb-2">
                                <div class="font-medium text-white">Токарный станок</div>
                                <div class="h-3 w-3 rounded-full bg-amber-400"></div>
                            </div>
                            <div class="text-sm text-white/60">Последнее ТО: 10.01.2024</div>
                            <div class="text-sm text-amber-400">Требует обслуживания</div>
                        </div>
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between mb-2">
                                <div class="font-medium text-white">Лазерная резка</div>
                                <div class="h-3 w-3 rounded-full bg-red-400"></div>
                            </div>
                            <div class="text-sm text-white/60">Последнее ТО: 05.01.2024</div>
                            <div class="text-sm text-red-400">Неисправен</div>
                        </div>
                    </div>
                </div>

                <!-- Maintenance History -->
                <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                    <h3 class="text-lg font-medium text-white mb-4">История обслуживания</h3>
                    <div id="maintenance-history" class="space-y-3">
                        <!-- Maintenance history will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // New task button
        document.getElementById('new-task-btn')?.addEventListener('click', () => {
            this.showNewTaskModal();
        });

        // Schedule maintenance button
        document.getElementById('schedule-maintenance-btn')?.addEventListener('click', () => {
            this.showScheduleMaintenanceModal();
        });

        // Priority filter
        document.getElementById('priority-filter')?.addEventListener('change', (e) => {
            this.filterTasks(e.target.value);
        });
    }

    async loadTasks() {
        try {
            const tasks = await this.db.getMaintenanceTasks();
            this.renderTasksList(tasks);
            this.updateStatistics(tasks);
        } catch (error) {
            console.error('Ошибка загрузки задач РММ:', error);
        }
    }

    renderTasksList(tasks) {
        const listElement = document.getElementById('tasks-list');
        if (!listElement) return;

        if (tasks.length === 0) {
            listElement.innerHTML = '<div class="text-center text-white/40 py-4">Нет задач</div>';
            return;
        }

        listElement.innerHTML = tasks.map(task => {
            const priorityClass = this.getPriorityClass(task.priority);
            const statusClass = this.getStatusClass(task.status);
            
            return `
                <div class="task-item p-3 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 cursor-pointer transition-colors" 
                     data-task-id="${task.id}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="font-medium text-white">${task.title}</div>
                        <div class="flex gap-1">
                            <span class="text-xs px-2 py-1 rounded ${priorityClass}">${this.getPriorityText(task.priority)}</span>
                            <span class="text-xs px-2 py-1 rounded ${statusClass}">${this.getStatusText(task.status)}</span>
                        </div>
                    </div>
                    <div class="text-sm text-white/60 mb-2">${task.equipment}</div>
                    <div class="flex items-center justify-between">
                        <div class="text-xs text-white/40">${task.assignedTo || 'Не назначен'}</div>
                        <div class="text-xs text-white/40">${new Date(task.deadline).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        listElement.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                this.selectTask(taskId);
            });
        });
    }

    getPriorityClass(priority) {
        const classes = {
            critical: 'bg-red-500/20 text-red-400',
            high: 'bg-orange-500/20 text-orange-400',
            medium: 'bg-yellow-500/20 text-yellow-400',
            low: 'bg-green-500/20 text-green-400'
        };
        return classes[priority] || 'bg-white/10 text-white/60';
    }

    getStatusClass(status) {
        const classes = {
            new: 'bg-blue-500/20 text-blue-400',
            in_progress: 'bg-amber-500/20 text-amber-400',
            completed: 'bg-green-500/20 text-green-400',
            cancelled: 'bg-gray-500/20 text-gray-400'
        };
        return classes[status] || 'bg-white/10 text-white/60';
    }

    getPriorityText(priority) {
        const texts = {
            critical: 'Критический',
            high: 'Высокий',
            medium: 'Средний',
            low: 'Низкий'
        };
        return texts[priority] || priority;
    }

    getStatusText(status) {
        const texts = {
            new: 'Новая',
            in_progress: 'В работе',
            completed: 'Завершена',
            cancelled: 'Отменена'
        };
        return texts[status] || status;
    }

    updateStatistics(tasks) {
        const active = tasks.filter(t => t.status === 'new').length;
        const critical = tasks.filter(t => t.priority === 'critical').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const completed = tasks.filter(t => t.status === 'completed').length;

        document.getElementById('active-tasks').textContent = active;
        document.getElementById('critical-tasks').textContent = critical;
        document.getElementById('in-progress-tasks').textContent = inProgress;
        document.getElementById('completed-tasks').textContent = completed;
    }

    async selectTask(taskId) {
        try {
            const task = await this.db.getMaintenanceTask(taskId);
            this.currentTask = task;
            this.renderTaskDetails(task);
            
            // Update active state
            document.querySelectorAll('.task-item').forEach(item => {
                item.classList.remove('border-white/20', 'bg-white/10');
            });
            document.querySelector(`[data-task-id="${taskId}"]`)?.classList.add('border-white/20', 'bg-white/10');
        } catch (error) {
            console.error('Ошибка загрузки задачи:', error);
        }
    }

    renderTaskDetails(task) {
        const detailsElement = document.getElementById('task-details');
        if (!detailsElement) return;

        detailsElement.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-white">${task.title}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.app.modules.maintenance.editTask('${task.id}')" 
                                class="h-8 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Редактировать
                        </button>
                        <button onclick="window.app.modules.maintenance.deleteTask('${task.id}')" 
                                class="h-8 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/10 text-sm text-red-400">
                            Удалить
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-white/60">Оборудование</label>
                        <div class="text-white">${task.equipment}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Приоритет</label>
                        <div class="text-white">${this.getPriorityText(task.priority)}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Статус</label>
                        <div class="text-white">${this.getStatusText(task.status)}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Назначен</label>
                        <div class="text-white">${task.assignedTo || 'Не назначен'}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Срок выполнения</label>
                        <div class="text-white">${new Date(task.deadline).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Тип работы</label>
                        <div class="text-white">${task.workType}</div>
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Описание</label>
                    <div class="text-white mt-1">${task.description || 'Описание отсутствует'}</div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Необходимые материалы</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderMaterials(task.materials)}
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Прогресс выполнения</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderProgress(task.progress)}
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Комментарии</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderComments(task.comments)}
                    </div>
                </div>
            </div>
        `;
    }

    renderMaterials(materials) {
        if (!materials || materials.length === 0) {
            return '<div class="text-white/40">Материалы не указаны</div>';
        }

        return materials.map(material => `
            <div class="flex items-center justify-between p-2 rounded-lg border border-white/5">
                <div>
                    <span class="text-white">${material.name}</span>
                    <span class="text-white/60 text-sm ml-2">${material.quantity} ${material.unit}</span>
                </div>
                <div class="text-white/40 text-sm">${material.status}</div>
            </div>
        `).join('');
    }

    renderProgress(progress) {
        if (!progress || progress.length === 0) {
            return '<div class="text-white/40">Прогресс не отслеживается</div>';
        }

        return progress.map(entry => `
            <div class="p-2 rounded-lg border border-white/5">
                <div class="flex justify-between items-center">
                    <span class="text-white">${entry.step}</span>
                    <span class="text-white/60 text-sm">${entry.percentage}%</span>
                </div>
                <div class="text-sm text-white/60 mt-1">${entry.description}</div>
                <div class="text-xs text-white/40 mt-1">${new Date(entry.date).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    renderComments(comments) {
        if (!comments || comments.length === 0) {
            return '<div class="text-white/40">Комментарии отсутствуют</div>';
        }

        return comments.map(comment => `
            <div class="p-2 rounded-lg border border-white/5">
                <div class="flex justify-between items-start">
                    <span class="text-white font-medium">${comment.author}</span>
                    <span class="text-white/40 text-sm">${new Date(comment.date).toLocaleDateString()}</span>
                </div>
                <div class="text-white/80 mt-1">${comment.text}</div>
            </div>
        `).join('');
    }

    filterTasks(priority) {
        const items = document.querySelectorAll('.task-item');
        items.forEach(item => {
            const taskPriority = item.querySelector('.text-xs').textContent;
            const matches = !priority || taskPriority === this.getPriorityText(priority);
            item.style.display = matches ? 'block' : 'none';
        });
    }

    showNewTaskModal() {
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Новая задача РММ</h3>
                <form id="new-task-form" class="space-y-3">
                    <div>
                        <label class="text-sm text-white/60">Название задачи</label>
                        <input type="text" name="title" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Оборудование</label>
                        <select name="equipment" required 
                                class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                            <option value="">Выберите оборудование</option>
                            <option value="Фрезерный станок">Фрезерный станок</option>
                            <option value="Токарный станок">Токарный станок</option>
                            <option value="Лазерная резка">Лазерная резка</option>
                            <option value="3D Принтер">3D Принтер</option>
                            <option value="Другое">Другое</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-sm text-white/60">Приоритет</label>
                            <select name="priority" required 
                                    class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                                <option value="">Выберите приоритет</option>
                                <option value="critical">Критический</option>
                                <option value="high">Высокий</option>
                                <option value="medium">Средний</option>
                                <option value="low">Низкий</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm text-white/60">Тип работы</label>
                            <select name="workType" required 
                                    class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                                <option value="">Выберите тип</option>
                                <option value="Ремонт">Ремонт</option>
                                <option value="Обслуживание">Обслуживание</option>
                                <option value="Профилактика">Профилактика</option>
                                <option value="Модернизация">Модернизация</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Срок выполнения</label>
                        <input type="date" name="deadline" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Исполнитель</label>
                        <input type="text" name="assignedTo" 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Описание</label>
                        <textarea name="description" rows="4" 
                                  class="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white"></textarea>
                    </div>
                </form>
                <div class="flex justify-end gap-2">
                    <button onclick="window.app.closeModal()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-sm">
                        Отмена
                    </button>
                    <button onclick="window.app.modules.maintenance.saveTask()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                        Создать
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal(modalContent);
    }

    async saveTask() {
        const form = document.getElementById('new-task-form');
        const formData = new FormData(form);
        
        const taskData = {
            title: formData.get('title'),
            equipment: formData.get('equipment'),
            priority: formData.get('priority'),
            workType: formData.get('workType'),
            deadline: formData.get('deadline'),
            assignedTo: formData.get('assignedTo'),
            description: formData.get('description'),
            status: 'new',
            createdAt: new Date().toISOString(),
            materials: [],
            progress: [],
            comments: []
        };

        try {
            await this.db.addMaintenanceTask(taskData);
            window.app.closeModal();
            this.loadTasks();
            window.app.showMessage('Задача успешно создана', 'success');
        } catch (error) {
            console.error('Ошибка сохранения задачи:', error);
            window.app.showMessage('Ошибка при создании задачи', 'error');
        }
    }

    showScheduleMaintenanceModal() {
        // Implementation for scheduling maintenance
        console.log('Модальное окно планирования обслуживания');
    }

    async editTask(taskId) {
        // Implementation for editing task
        console.log('Редактирование задачи:', taskId);
    }

    async deleteTask(taskId) {
        if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
            try {
                await this.db.deleteMaintenanceTask(taskId);
                this.loadTasks();
                document.getElementById('task-details').innerHTML = `
                    <div class="text-center text-white/40 py-8">
                        Выберите задачу для просмотра деталей
                    </div>
                `;
                window.app.showMessage('Задача удалена', 'success');
            } catch (error) {
                console.error('Ошибка удаления задачи:', error);
                window.app.showMessage('Ошибка при удалении задачи', 'error');
            }
        }
    }
}

window.MaintenanceModule = MaintenanceModule;
