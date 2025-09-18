// Модуль технологов - с поддержкой динамической загрузки

class TechnologyModule {
    constructor(options = {}) {
        // Сохраняем опции от загрузчика модулей
        this.moduleId = options.moduleId || 'technology';
        this.meta = options.meta || {};
        this.loader = options.loader || null;
        
        // Инициализация модуля
        this.db = null;
        this.currentMaterial = null;
        
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
            await this.loadMaterials();
            
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
                // Fallback: создаем заглушку для работы без БД
                this.db = {
                    getMaterials: () => Promise.resolve([]),
                    getMaterial: () => Promise.resolve({}),
                    saveMaterial: () => Promise.resolve({ success: true }),
                    deleteMaterial: () => Promise.resolve({ success: true })
                };
            }
            
            console.log(`[${this.moduleId}] База данных инициализирована`);
            
        } catch (error) {
            console.warn(`[${this.moduleId}] Ошибка инициализации БД:`, error);
            // Создаем заглушку для работы без БД
            this.db = {
                getMaterials: () => Promise.resolve([]),
                getMaterial: () => Promise.resolve({}),
                saveMaterial: () => Promise.resolve({ success: true }),
                deleteMaterial: () => Promise.resolve({ success: true })
            };
        }
    }

    render() {
        const moduleElement = document.getElementById('technology-module');
        moduleElement.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-semibold text-white">Модуль технологов</h1>
                        <p class="text-white/60">База материалов, ТУ, параметры оборудования</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="add-material-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + Новый материал
                        </button>
                        <button id="add-spec-btn" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            + ТУ
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Materials List -->
                    <div class="lg:col-span-1">
                        <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-medium text-white">Материалы</h3>
                                <input type="text" id="material-search" placeholder="Поиск материалов..." 
                                       class="h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/40">
                            </div>
                            <div id="materials-list" class="space-y-2 max-h-96 overflow-y-auto">
                                <!-- Materials will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Material Details -->
                    <div class="lg:col-span-2">
                        <div id="material-details" class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                            <div class="text-center text-white/40 py-8">
                                Выберите материал для просмотра деталей
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Technical Specifications -->
                <div class="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
                    <h3 class="text-lg font-medium text-white mb-4">Технические условия</h3>
                    <div id="specifications-list" class="space-y-3">
                        <!-- Specifications will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add material button
        document.getElementById('add-material-btn')?.addEventListener('click', () => {
            this.showAddMaterialModal();
        });

        // Add specification button
        document.getElementById('add-spec-btn')?.addEventListener('click', () => {
            this.showAddSpecModal();
        });

        // Material search
        document.getElementById('material-search')?.addEventListener('input', (e) => {
            this.filterMaterials(e.target.value);
        });
    }

    async loadMaterials() {
        try {
            const materials = await this.db.getMaterials();
            this.renderMaterialsList(materials);
        } catch (error) {
            console.error('Ошибка загрузки материалов:', error);
        }
    }

    renderMaterialsList(materials) {
        const listElement = document.getElementById('materials-list');
        if (!listElement) return;

        if (materials.length === 0) {
            listElement.innerHTML = '<div class="text-center text-white/40 py-4">Нет материалов</div>';
            return;
        }

        listElement.innerHTML = materials.map(material => `
            <div class="material-item p-3 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 cursor-pointer transition-colors" 
                 data-material-id="${material.id}">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium text-white">${material.name}</div>
                        <div class="text-sm text-white/60">${material.type}</div>
                    </div>
                    <div class="text-xs text-white/40">${material.code}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        listElement.querySelectorAll('.material-item').forEach(item => {
            item.addEventListener('click', () => {
                const materialId = item.dataset.materialId;
                this.selectMaterial(materialId);
            });
        });
    }

    async selectMaterial(materialId) {
        try {
            const material = await this.db.getMaterial(materialId);
            this.currentMaterial = material;
            this.renderMaterialDetails(material);
            
            // Update active state
            document.querySelectorAll('.material-item').forEach(item => {
                item.classList.remove('border-white/20', 'bg-white/10');
            });
            document.querySelector(`[data-material-id="${materialId}"]`)?.classList.add('border-white/20', 'bg-white/10');
        } catch (error) {
            console.error('Ошибка загрузки материала:', error);
        }
    }

    renderMaterialDetails(material) {
        const detailsElement = document.getElementById('material-details');
        if (!detailsElement) return;

        detailsElement.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-white">${material.name}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.app.modules.technology.editMaterial('${material.id}')" 
                                class="h-8 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                            Редактировать
                        </button>
                        <button onclick="window.app.modules.technology.deleteMaterial('${material.id}')" 
                                class="h-8 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/10 text-sm text-red-400">
                            Удалить
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-white/60">Код материала</label>
                        <div class="text-white">${material.code}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Тип</label>
                        <div class="text-white">${material.type}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Химический состав</label>
                        <div class="text-white">${material.composition || 'Не указан'}</div>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Марка</label>
                        <div class="text-white">${material.grade || 'Не указана'}</div>
                    </div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Описание</label>
                    <div class="text-white mt-1">${material.description || 'Описание отсутствует'}</div>
                </div>

                <div>
                    <label class="text-sm text-white/60">Технические характеристики</label>
                    <div class="mt-2 space-y-2">
                        ${this.renderTechnicalSpecs(material.specifications)}
                    </div>
                </div>
            </div>
        `;
    }

    renderTechnicalSpecs(specs) {
        if (!specs || specs.length === 0) {
            return '<div class="text-white/40">Характеристики не указаны</div>';
        }

        return specs.map(spec => `
            <div class="flex justify-between p-2 rounded-lg border border-white/5">
                <span class="text-white">${spec.name}</span>
                <span class="text-white/60">${spec.value} ${spec.unit}</span>
            </div>
        `).join('');
    }

    filterMaterials(searchTerm) {
        const items = document.querySelectorAll('.material-item');
        items.forEach(item => {
            const materialName = item.querySelector('.font-medium').textContent.toLowerCase();
            const materialCode = item.querySelector('.text-xs').textContent.toLowerCase();
            const matches = materialName.includes(searchTerm.toLowerCase()) || 
                           materialCode.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    showAddMaterialModal() {
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-white">Новый материал</h3>
                <form id="add-material-form" class="space-y-3">
                    <div>
                        <label class="text-sm text-white/60">Название</label>
                        <input type="text" name="name" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Код</label>
                        <input type="text" name="code" required 
                               class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Тип</label>
                        <select name="type" required 
                                class="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white">
                            <option value="">Выберите тип</option>
                            <option value="metal">Металл</option>
                            <option value="plastic">Пластик</option>
                            <option value="ceramic">Керамика</option>
                            <option value="composite">Композит</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-white/60">Химический состав</label>
                        <textarea name="composition" rows="2" 
                                  class="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white"></textarea>
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
                    <button onclick="window.app.modules.technology.saveMaterial()" 
                            class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">
                        Сохранить
                    </button>
                </div>
            </div>
        `;
        
        window.app.showModal(modalContent);
    }

    async saveMaterial() {
        const form = document.getElementById('add-material-form');
        const formData = new FormData(form);
        
        const materialData = {
            name: formData.get('name'),
            code: formData.get('code'),
            type: formData.get('type'),
            composition: formData.get('composition'),
            description: formData.get('description'),
            createdAt: new Date().toISOString()
        };

        try {
            await this.db.addMaterial(materialData);
            window.app.closeModal();
            this.loadMaterials();
            window.app.showMessage('Материал успешно добавлен', 'success');
        } catch (error) {
            console.error('Ошибка сохранения материала:', error);
            window.app.showMessage('Ошибка при сохранении материала', 'error');
        }
    }

    async editMaterial(materialId) {
        // Implementation for editing material
        console.log('Edit material:', materialId);
    }

    async deleteMaterial(materialId) {
        if (confirm('Вы уверены, что хотите удалить этот материал?')) {
            try {
                await this.db.deleteMaterial(materialId);
                this.loadMaterials();
                document.getElementById('material-details').innerHTML = `
                    <div class="text-center text-white/40 py-8">
                        Выберите материал для просмотра деталей
                    </div>
                `;
                window.app.showMessage('Материал удален', 'success');
            } catch (error) {
                console.error('Ошибка удаления материала:', error);
                window.app.showMessage('Ошибка при удалении материала', 'error');
            }
        }
    }

    showAddSpecModal() {
        // Implementation for adding technical specifications
        console.log('Add specification modal');
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
            this.currentMaterial = null;
            
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
            moduleId: 'technology',
            moduleName: 'Модуль технологов',
            version: '1.0.0',
            description: 'Модуль для управления материалами, ТУ и параметрами оборудования',
            dependencies: ['database'],
            author: 'ProcessCraft Team',
            enabled: true
        };
    }
}

// Экспорт модуля для ES6 import
export default TechnologyModule;

// Глобальная доступность для совместимости с существующим кодом
window.TechnologyModule = TechnologyModule;
