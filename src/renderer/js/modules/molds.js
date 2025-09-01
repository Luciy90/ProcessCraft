// Производство форм

class MoldsModule {
    constructor() {
        this.db = new Database();
        this.currentProject = null;
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.loadProjects();
    }

    render() {
        const moduleElement = document.getElementById('molds-module');
        moduleElement.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-semibold text-white">Производство форм</h1>
                        <p class="text-white/60">3D-печать, фрезеровка, токарка, резка</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="new-project-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + Новый проект
                        </button>
                        <button id="request-materials-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Запрос материалов
                        </button>
                    </div>
                </div>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Активные проекты</div>
                        <div class="mt-2 text-2xl font-semibold text-white" id="active-projects">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">В работе</div>
                        <div class="mt-2 text-2xl font-semibold text-amber-400" id="in-progress">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Завершено</div>
                        <div class="mt-2 text-2xl font-semibold text-green-400" id="completed">0</div>
                    </div>
                    <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                        <div class="text-sm text-white/60">Задержки</div>
                        <div class="mt-2 text-2xl font-semibold text-red-400" id="delayed">0</div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Projects List -->
                    <div class="lg:col-span-1">
                        <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-medium text-white">Проекты форм</h3>
                                <select id="status-filter" class="h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-white">
                                    <option value="">Все статусы</option>
                                    <option value="planning">Планирование</option>
                                    <option value="in_progress">В работе</option>
                                    <option value="completed">Завершено</option>
                                    <option value="delayed">Задержка</option>
                                </select>
                            </div>
                            <div id="projects-list" class="space-y-2 max-h-96 overflow-y-auto">
                                <!-- Projects will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Project Details -->
                    <div class="lg:col-span-2">
                        <div id="project-details" class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="text-center text-white/40 py-8">
                                Выберите проект для просмотра деталей
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Equipment Status -->
                <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                    <h3 class="text-lg font-medium text-white mb-4">Статус оборудования</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium text-white">3D Принтер</div>
                                    <div class="text-sm text-green-400">Свободен</div>
                                </div>
                                <div class="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                        </div>
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium text-white">Фрезерный станок</div>
                                    <div class="text-sm text-amber-400">Занят</div>
                                </div>
                                <div class="h-3 w-3 rounded-full bg-amber-400"></div>
                            </div>
                        </div>
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium text-white">Токарный станок</div>
                                    <div class="text-sm text-green-400">Свободен</div>
                                </div>
                                <div class="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                        </div>
                        <div class="p-3 rounded-lg border border-white/5">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="font-medium text-white">Лазерная резка</div>
                                    <div class="text-sm text-red-400">Неисправен</div>
                                </div>
                                <div class="h-3 w-3 rounded-full bg-red-400"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // New project button
        document.getElementById('new-project-btn')?.addEventListener('click', () => {
            this.showNewProjectModal();
        });

        // Request materials button
        document.getElementById('request-materials-btn')?.addEventListener('click', () => {
            this.showRequestMaterialsModal();
        });

        // Status filter
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filterProjects(e.target.value);
        });
    }

    async loadProjects() {
        try {
            const projects = await this.db.getMoldProjects();
            this.renderProjectsList(projects);
            this.updateStatistics(projects);
        } catch (error) {
            console.error('Ошибка загрузки проектов форм:', error);
        }
    }

    renderProjectsList(projects) {
        const listElement = document.getElementById('projects-list');
        if (!listElement) return;

        if (projects.length === 0) {
            listElement.innerHTML = '<div class="text-center text-white/40 py-4">Нет проектов</div>';
            return;
        }

        listElement.innerHTML = projects.map(project => {
            const statusClass = this.getStatusClass(project.status);
            const progress = this.calculateProgress(project);
            
            return `
                <div class="project-item p-3 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 cursor-pointer transition-colors" 
                     data-project-id="${project.id}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="font-medium text-white">${project.name}</div>
                        <span class="text-xs px-2 py-1 rounded ${statusClass}">${this.getStatusText(project.status)}</span>
                    </div>
                    <div class="text-sm text-white/60 mb-2">${project.customer}</div>
                    <div class="flex items-center justify-between">
                        <div class="text-xs text-white/40">Прогресс: ${progress}%</div>
                        <div class="text-xs text-white/40">${new Date(project.deadline).toLocaleDateString()}</div>
                    </div>
                    <div class="mt-2 w-full bg-white/10 rounded-full h-1">
                        <div class="bg-blue-400 h-1 rounded-full" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        listElement.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = item.dataset.projectId;
                this.selectProject(projectId);
            });
        });
    }

    getStatusClass(status) {
        const classes = {
            planning: 'bg-blue-500/20 text-blue-400',
            in_progress: 'bg-amber-500/20 text-amber-400',
            completed: 'bg-green-500/20 text-green-400',
            delayed: 'bg-red-500/20 text-red-400'
        };
        return classes[status] || 'bg-white/10 text-white/60';
    }

    getStatusText(status) {
        const texts = {
            planning: 'Планирование',
            in_progress: 'В работе',
            completed: 'Завершено',
            delayed: 'Задержка'
        };
        return texts[status] || status;
    }

    calculateProgress(project) {
        if (!project.tasks || project.tasks.length === 0) return 0;
        const completed = project.tasks.filter(task => task.status === 'completed').length;
        return Math.round((completed / project.tasks.length) * 100);
    }

    updateStatistics(projects) {
        const active = projects.filter(p => p.status === 'planning').length;
        const inProgress = projects.filter(p => p.status === 'in_progress').length;
        const completed = projects.filter(p => p.status === 'completed').length;
        const delayed = projects.filter(p => p.status === 'delayed').length;

        document.getElementById('active-projects').textContent = active;
        document.getElementById('in-progress').textContent = inProgress;
        document.getElementById('completed').textContent = completed;
        document.getElementById('delayed').textContent = delayed;
    }

    async selectProject(projectId) {
        try {
            const project = await this.db.getMoldProject(projectId);
            this.currentProject = project;
            this.renderProjectDetails(project);
            
            // Update active state
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.remove('border-white/20', 'bg-white/10');
            });
            document.querySelector(`[data-project-id="${projectId}"]`)?.classList.add('border-white/20', 'bg-white/10');
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
        }
    }

    renderProjectDetails(project) {
        const detailsElement = document.getElementById('project-details');
        if (!detailsElement) return;

        const progress = this.calculateProgress(project);

        detailsElement.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-white">${project.name}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.app.modules.molds.editProject('${project.id}')" 
                                class="h-8 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Редактировать
                        </button>
                        <button onclick="window.app.modules.molds.deleteProject('${project.id}')" 
                                class="h-8 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/10 text-sm text-red-400">
                            Удалить
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-white/60">Клиент</label>
                        <div class="text-white">${project.customer}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Статус</label>
                        <div class="text-white">${this.getStatusText(project.status)}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Срок выполнения</label>
                        <div class="text-white">${new Date(project.deadline).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Прогресс</label>
                        <div class="text-white">${progress}%</div>
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Описание</label>
                    <div class="text-white mt-1">${project.description || 'Описание отсутствует'}</div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Задачи</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderTasks(project.tasks)}
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Материалы</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderMaterials(project.materials)}
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Затраты времени</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderTimeTracking(project.timeTracking)}
                    </div>
                </div>
            </div>
        `;
    }

    renderTasks(tasks) {
        if (!tasks || tasks.length === 0) {
            return '<div class="text-white/40">Задачи не назначены</div>';
        }

        return tasks.map(task => `
            <div class="flex items-center justify-between p-2 rounded-lg border border-white/5">
                <div>
                    <span class="text-white">${task.name}</span>
                    <span class="text-white/60 text-sm ml-2">${task.equipment}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span>
                    <span class="text-white/40 text-sm">${task.estimatedHours}ч</span>
                </div>
            </div>
        `).join('');
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

    renderTimeTracking(timeTracking) {
        if (!timeTracking || timeTracking.length === 0) {
            return '<div class="text-white/40">Учет времени отсутствует</div>';
        }

        const totalHours = timeTracking.reduce((sum, entry) => sum + entry.hours, 0);
        return `
            <div class="p-2 rounded-lg border border-white/5">
                <div class="text-white">Общее время: ${totalHours}ч</div>
                <div class="text-sm text-white/60 mt-1">
                    ${timeTracking.map(entry => 
                        `${entry.task}: ${entry.hours}ч (${new Date(entry.date).toLocaleDateString()})`
                    ).join(', ')}
                </div>
            </div>
        `;
    }

    filterProjects(status) {
        const items = document.querySelectorAll('.project-item');
        items.forEach(item => {
            const projectStatus = item.querySelector('.text-xs').textContent;
            const matches = !status || projectStatus === this.getStatusText(status);
            item.style.display = matches ? 'block' : 'none';
        });
    }

    showNewProjectModal() {
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Новый проект формы</h3>
                <form id="new-project-form" class="space-y-3">
                    <div>
                        <label class="text-sm text-white/60">Название проекта</label>
                        <input type="text" name="name" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Клиент</label>
                        <input type="text" name="customer" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Срок выполнения</label>
                        <input type="date" name="deadline" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Тип формы</label>
                        <select name="type" required 
                                class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                            <option value="">Выберите тип</option>
                            <option value="3d_print">3D Печать</option>
                            <option value="milling">Фрезеровка</option>
                            <option value="lathe">Токарка</option>
                            <option value="laser_cut">Лазерная резка</option>
                            <option value="complex">Комплексная</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Описание</label>
                        <textarea name="description" rows="3" 
                                  class="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white"></textarea>
                    </div>
                </form>
                <div class="flex justify-end gap-2">
                    <button onclick="window.app.closeModal()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-sm">
                        Отмена
                    </button>
                    <button onclick="window.app.modules.molds.saveProject()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                        Создать
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal(modalContent);
    }

    async saveProject() {
        const form = document.getElementById('new-project-form');
        const formData = new FormData(form);
        
        const projectData = {
            name: formData.get('name'),
            customer: formData.get('customer'),
            deadline: formData.get('deadline'),
            type: formData.get('type'),
            description: formData.get('description'),
            status: 'planning',
            createdAt: new Date().toISOString(),
            tasks: [],
            materials: [],
            timeTracking: []
        };

        try {
            await this.db.addMoldProject(projectData);
            window.app.closeModal();
            this.loadProjects();
            window.app.showMessage('Проект успешно создан', 'success');
        } catch (error) {
            console.error('Ошибка сохранения проекта:', error);
            window.app.showMessage('Ошибка при создании проекта', 'error');
        }
    }

    showRequestMaterialsModal() {
        // Implementation for requesting materials from warehouse
        console.log('Request materials modal');
    }

    async editProject(projectId) {
        // Implementation for editing project
        console.log('Edit project:', projectId);
    }

    async deleteProject(projectId) {
        if (confirm('Вы уверены, что хотите удалить этот проект?')) {
            try {
                await this.db.deleteMoldProject(projectId);
                this.loadProjects();
                document.getElementById('project-details').innerHTML = `
                    <div class="text-center text-white/40 py-8">
                        Выберите проект для просмотра деталей
                    </div>
                `;
                window.app.showMessage('Проект удален', 'success');
            } catch (error) {
                console.error('Ошибка удаления проекта:', error);
                window.app.showMessage('Ошибка при удалении проекта', 'error');
            }
        }
    }
}

window.MoldsModule = MoldsModule;
