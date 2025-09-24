// Основной файл приложения ProcessCraft

import { generateTopBarAvatar, updateAvatarInDOM, generateAvatarHTML } from './utils/avatarUtils.js';

class ProcessCraftApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.modules = {};
        this.notifications = [];
        this.init();
    }

    async init() {
        this.renderChromeFromConfig();
        this.setupEventListeners();
        
        // Обработчик событий загрузки модулей
    document.addEventListener('modules:loaded', async (e) => {
            console.log('✓ Получено событие modules:loaded', e.detail);
            this.onModulesLoaded(e.detail);
        });
        
        // Инициализация модулей
    await this.initializeModules(); 
        
    // Попытка подгрузить и вставить шаблон модального окна настроек (templates/model_settings.html)
    // Защищённо: если fetch или вставка неудачны — продолжаем без фатальной ошибки.
    (async () => {
      try {
        const tplPath = 'js/../templates/model_settings.html';
        const res = await fetch(tplPath, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
        const html = await res.text();
        // Вставляем в body в конец — шаблон содержит свой <script> с поведением, поэтому он выполнится после вставки
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        console.log('Template model_settings.html loaded and inserted');
                
        // Попытка импортировать ES-модуль и инициализировать
        try {
          const mod = await import('./model_settings.js');
          if (mod && typeof mod.initModelSettings === 'function') {
            mod.initModelSettings();
            console.log('initModelSettings invoked');
          } else if (mod && mod.default && typeof mod.default.initModelSettings === 'function') {
            mod.default.initModelSettings();
            console.log('initModelSettings invoked from default export');
          } else {
            console.warn('model_settings module loaded but initModelSettings not found');
          }
        } catch (e) {
          console.warn('Failed to import or invoke model_settings module:', e);
        }
      } catch (e) {
        // Неприменимо в некоторых окружениях (CSP, file://, Electron packaging). Это не фатально.
        console.warn('Could not load model_settings template:', e);
      }
    })();
        
        // Настраиваем обработчики навигации после рендеринга
        this.setupNavigationListeners();
        
        // Активируем модуль dashboard по умолчанию
        this.switchModule('dashboard').catch(error => console.error('Error switching to dashboard:', error));
        
        console.log('ProcessCraft приложение инициализировано');
        
        // Тестирование переключения модулей (можно удалить после проверки)
        this.testModuleSwitching();
    }
    
    /**
     * Обработчик события завершения загрузки модулей
     * @param {Object} detail Детали события
     */
    onModulesLoaded(detail) {
        console.log('Обработка события загрузки модулей');
        
        // Обновляем навигацию с учетом загруженных модулей
        this.updateNavigationFromModules(detail.success);
        
        // Перенастраиваем обработчики навигации
        this.setupNavigationListeners();
    }
    
    /**
     * Обновление навигации на основе загруженных модулей
     * @param {Array} loadedModules Массив загруженных модулей
     */
    updateNavigationFromModules(loadedModules) {
        // Можно добавить логику динамического обновления навигации
        // на основе метаданных модулей
        console.log('Обновление навигации на основе загруженных модулей:', 
            loadedModules.map(m => m.id));
    }
    
    testModuleSwitching() {
        console.log('Тестирование переключения модулей...');
        console.log('Доступные модули:', Object.keys(this.modules));
        
        // Динамически проверяем загруженные модули
        const loadedModules = Object.keys(this.modules);
        console.log(`Проверка ${loadedModules.length} загруженных модулей:`);
        
        loadedModules.forEach(moduleName => {
            const container = document.getElementById(`${moduleName}-module`);
            const navItem = document.querySelector(`[data-module="${moduleName}"]`);
            
            if (!container) {
                console.warn(`⚠ Контейнер для модуля "${moduleName}" не найден в DOM`);
            }
            if (!navItem) {
                console.warn(`⚠ Навигационный элемент для модуля "${moduleName}" не найден`);
            }
            
            console.log(`Модуль ${moduleName}:`, {
                container: !!container,
                navItem: !!navItem,
                moduleInstance: !!this.modules[moduleName],
                initialized: !!this.modules[moduleName]?._initialized
            });
        });
        
        // Добавляем глобальную функцию для тестирования
        window.testSwitchModule = (moduleName) => {
            console.log('Тестовое переключение на модуль:', moduleName);
            this.switchModule(moduleName).catch(error => console.error(`Error switching to module ${moduleName}:`, error));
        };
        
        console.log('Для тестирования используйте: testSwitchModule("orders")');
        
        // Тестирование иконок
        window.testIcons = () => {
            console.log('Тестирование иконок...');
            if (window.lucide) {
                console.log('Lucide доступен:', window.lucide);
                try {
                    window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
                    console.log('Иконки созданы успешно');
                } catch (error) {
                    console.error('Ошибка создания иконок:', error);
                }
            } else {
                console.error('Lucide недоступен');
            }
        };
        
        console.log('Для тестирования иконок используйте: testIcons()');
    }

    renderChromeFromConfig() {
        const cfg = window.UI_CONFIG;
        // Topbar texts
        const titleEl = document.getElementById('current-module');
        if (titleEl) titleEl.textContent = cfg.nav.find(n => n.key === 'dashboard')?.title || cfg.texts.topbar.title_default;
        // Logo text on top bar
        const logoBadge = document.getElementById('logo-badge');
        const logoText = document.getElementById('logo-text');
        if (logoBadge && cfg.app.logoText) logoBadge.textContent = cfg.app.logoText;
        if (logoText) logoText.textContent = `${cfg.app.name} • ${cfg.app.tagline}`;
        // Version badge
        document.querySelectorAll('span').forEach(s => {
            if (s.textContent === 'v1.0.0') s.textContent = cfg.app.version;
        });

        // Sidebar nav from config
        const sidebar = document.querySelector('aside nav');
        if (sidebar) {
            sidebar.innerHTML = cfg.nav.map(item => `
              <a href="#" class="nav-item group flex items-center gap-2 px-2 py-2 rounded-lg border border-white/5 hover:border-white/15 hover:bg-white/5 transition-colors" data-module="${item.key}">
                <div class="h-6 w-6 grid place-items-center rounded-md bg-white/[0.06]"><svg data-lucide="${cfg.icons.nav[item.key]}" class="h-4 w-4"></svg></div>
                <div class="flex-1"><div class="text-[13px] font-medium text-white/90">${item.title}</div><div class="text-[11px] text-white/50">${item.subtitle || ''}</div></div>
              </a>`).join('');
            // Добавляем скрытый пункт для профиля, чтобы можно было переключаться программно
            if (!sidebar.querySelector('[data-module="profile"]')) {
                const hiddenProfile = document.createElement('a');
                hiddenProfile.href = '#';
                hiddenProfile.className = 'nav-item hidden';
                hiddenProfile.setAttribute('data-module', 'profile');
                sidebar.appendChild(hiddenProfile);
            }
        }

        // Dashboard KPI cards from config
        const dash = document.getElementById('dashboard-module');
        if (dash) {
            const kpiGrid = dash.querySelector('.grid');
            if (kpiGrid) {
                kpiGrid.innerHTML = cfg.dashboard.cards.map(card => {
                    const ring = card.ring;
                    return `<div class="rounded-xl border border-white/10 ring-1 ring-${ring}-400/20 bg-neutral-900/40 backdrop-blur backdrop-saturate-150 p-4">
                      <div class="text-sm text-white/60">${card.title}</div>
                      <div class="mt-2 text-3xl font-semibold tracking-tight" id="${card.key}">0</div>
                    </div>`;
                }).join('');
            }
        }

        // Recreate lucide icons after dynamic render and repair empties
        if (window.lucide?.createIcons) {
            try {
                window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
                if (typeof window.repairLucideIcons === 'function') window.repairLucideIcons(document);
                console.log('Иконки пересозданы после рендеринга');
            } catch (error) {
                console.warn('Ошибка при создании иконок Lucide:', error);
            }
        } else {
            console.error('Lucide не доступен для создания иконок');
        }
        
        // Настраиваем обработчики навигации после рендеринга
        this.setupNavigationListeners();
    }

    setupEventListeners() {
        // Навигация по модулям
        this.setupNavigationListeners();
        
        // Уведомления
        document.getElementById('notifications-btn').addEventListener('click', () => {
            this.toggleNotifications();
        });

        document.getElementById('close-notifications').addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Настройки
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        // Кнопка пользователя (аватар)
        const userBtn = document.getElementById('user-btn');
        const loginBtn = document.getElementById('login-btn');
        
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const current = window.UserStore?.getCurrentUser();
                if (!current) this.openLoginModal(); else this.openProfilePage();
            });
        }
        
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openLoginModal();
            });
        }
        
        // первичный рендер
        this.updateUserInterface();

        // Модальные окна
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.closeModal();
            }
        });

        // Обработка меню приложения
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('menu-new-order', () => {
            this.switchModule('orders').catch(error => console.error('Error switching to orders:', error));
            // Здесь будет логика создания нового заказа
        });

        ipcRenderer.on('menu-open', () => {
            this.openFile();
        });
    }
    
    setupNavigationListeners() {
        // Удаляем старые обработчики
        document.querySelectorAll('.nav-item').forEach(item => {
            item.removeEventListener('click', this.handleNavigationClick);
        });
        
        // Добавляем новые обработчики
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', this.handleNavigationClick.bind(this));
        });
    }
    
    handleNavigationClick(e) {
        e.preventDefault();
        const moduleName = e.currentTarget.dataset.module;
        console.log('Клик по навигации:', moduleName);
        this.switchModule(moduleName).catch(error => console.error(`Error switching to module ${moduleName}:`, error));
    }

    async switchModule(moduleName) {
        console.log('Переключение на модуль:', moduleName);
        
        try {
            // Убираем активный класс с текущего модуля
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.module-content').forEach(content => {
                content.classList.remove('active');
            });

            // Активируем новый модуль
            const navItem = document.querySelector(`[data-module="${moduleName}"]`);
            const moduleElement = document.getElementById(`${moduleName}-module`);
            
            if (!moduleElement) {
                console.error('Контейнер модуля не найден:', moduleName);
                return;
            }
            
            if (navItem) {
                navItem.classList.add('active');
            } else {
                console.warn('Элемент навигации не найден для модуля:', moduleName);
            }
            moduleElement.classList.add('active');

            // Обновляем заголовок модуля
            const cfg = window.UI_CONFIG;
            const moduleTitle = cfg.texts.modules[moduleName] || moduleName;
            const currentModuleEl = document.getElementById('current-module');
            if (currentModuleEl) {
                currentModuleEl.textContent = moduleTitle;
            }
            
            this.currentModule = moduleName;

            // Инициализируем модуль если он еще не загружен
            // Проверяем сначала динамический реестр, потом this.modules
            let moduleInstance = null;
            
            // Поиск в динамическом реестре
            if (window.getModuleInstance) {
                moduleInstance = window.getModuleInstance(moduleName);
                if (moduleInstance) {
                    console.log(`Модуль ${moduleName} найден в динамическом реестре`);
                }
            }
            
            // Fallback на статический this.modules
            if (!moduleInstance && this.modules && this.modules[moduleName]) {
                moduleInstance = this.modules[moduleName];
                console.log(`Модуль ${moduleName} найден в статическом реестре`);
            }
            
            // Инициализация модуля (только если еще не инициализирован)
            if (moduleInstance && typeof moduleInstance.init === 'function') {
                // Проверяем, не инициализирован ли модуль уже
                if (!moduleInstance._initialized) {
                    console.log('Инициализация модуля:', moduleName);
                    try {
                        await moduleInstance.init();
                        moduleInstance._initialized = true; // Помечаем как инициализированный
                    } catch (error) {
                        console.error(`Ошибка инициализации модуля ${moduleName}:`, error);
                    }
                } else {
                    console.log(`Модуль ${moduleName} уже инициализирован, повторная инициализация пропущена`);
                }
            } else {
                console.warn('Модуль не найден или не имеет метода init:', moduleName);
                
                // Попытка ленивой загрузки модуля
                if (window.moduleLoader && typeof window.moduleLoader.initModule === 'function') {
                    console.log(`Попытка ленивой инициализации модуля: ${moduleName}`);
                    window.moduleLoader.initModule(moduleName).catch(console.error);
                }
            }
        } catch (error) {
            console.error('Ошибка при переключении модуля:', moduleName, error);
        }
    }

    /**
     * Получение экземпляра модуля (безопасный доступ)
     * @param {string} moduleName Название модуля
     * @returns {Object|null} Экземпляр модуля или null
     */
    getModule(moduleName) {
        return this.modules && this.modules[moduleName] ? this.modules[moduleName] : null;
    }

    async initializeModules() {
        try {
            console.log('Запуск динамической загрузки модулей...');
            
            // Динамическая загрузка модулей
            const loadResult = await window.loadModules({
                path: 'js/modules',
                dev: true, // включаем dev режим для отладки
                lazyLoad: false // инициализируем модули сразу
            });
            
            if (loadResult.success) {
                console.log('✓ Динамическая загрузка модулей завершена успешно');
                console.log(`Загружено модулей: ${loadResult.loaded.length}/${loadResult.total}`);
                
                // Создаем совместимый объект this.modules для существующего кода
                this.modules = {};
                for (const moduleInfo of loadResult.loaded) {
                    this.modules[moduleInfo.id] = moduleInfo.instance;
                }
                
                // Делаем модули доступными глобально через window.app.modules
                window.app.modules = this.modules;
                
                console.log('Доступные модули:', Object.keys(this.modules));
                
                // Логируем неудачные загрузки
                if (loadResult.failed.length > 0) {
                    console.warn('Модули с ошибками загрузки:', loadResult.failed);
                }
                
            } else {
                console.error('✗ Ошибка динамической загрузки модулей:', loadResult.error);
                // Fallback на статическую инициализацию
                await this.initializeModulesStatic();
            }
            
        } catch (error) {
            console.error('Критическая ошибка инициализации модулей:', error);
            // Fallback на статическую инициализацию
            await this.initializeModulesStatic();
        }
    }
    
    // Fallback: статическая инициализация модулей (старый способ)
    async initializeModulesStatic() {
        try {
            console.log('Fallback: статическая инициализация модулей...');
            
            this.modules = {};
            
            // Инициализация модулей с проверкой доступности классов
            const moduleClasses = {
                dashboard: window.DashboardModule,
                orders: window.OrdersModule,
                design: window.DesignModule,
                technology: window.TechnologyModule,
                warehouse: window.WarehouseModule,
                molds: window.MoldsModule,
                maintenance: window.MaintenanceModule,
                production: window.ProductionModule,
                analytics: window.AnalyticsModule
            };
            
            for (const [moduleId, ModuleClass] of Object.entries(moduleClasses)) {
                if (ModuleClass && typeof ModuleClass === 'function') {
                    try {
                        this.modules[moduleId] = new ModuleClass();
                        console.log(`✓ Статически инициализирован модуль: ${moduleId}`);
                    } catch (error) {
                        console.error(`✗ Ошибка статической инициализации модуля ${moduleId}:`, error);
                    }
                } else {
                    console.warn(`⚠ Класс модуля ${moduleId} не найден или недоступен`);
                }
            }
            
            console.log('Статическая инициализация завершена. Доступные модули:', Object.keys(this.modules));
            
            // Делаем модули доступными глобально через window.app.modules
            window.app.modules = this.modules;
            
        } catch (error) {
            console.error('Ошибка статической инициализации модулей:', error);
        }
    }

    // ============ Пользователи / Личный кабинет ============
    async updateUserInterface() {
        const current = window.UserStore?.getCurrentUser();
        const userBtn = document.getElementById('user-btn');
        const loginBtn = document.getElementById('login-btn');
        
        if (current) {
            // Пользователь авторизован - показываем аватар, скрываем кнопку входа
            if (userBtn) userBtn.classList.remove('hidden');
            if (loginBtn) loginBtn.classList.add('hidden');
            await this.renderUserAvatar();
        } else {
            // Пользователь не авторизован - скрываем аватар, показываем кнопку входа
            if (userBtn) userBtn.classList.add('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
        }
    }

    async renderUserAvatar() {
        const current = window.UserStore?.getCurrentUser();
        const img = document.getElementById('user-avatar');
        const fallback = document.getElementById('user-avatar-fallback');
        if (!img || !fallback) return;

    try {
  // Use module function to get avatar for top bar
  const avatarData = await generateTopBarAvatar(current);
            
            if (typeof avatarData === 'string') {
                // Image path
                img.src = avatarData;
                img.classList.remove('hidden');
                fallback.classList.add('hidden');
            } else if (avatarData && typeof avatarData === 'object') {
                // Colored letter
                fallback.textContent = avatarData.letter;
                fallback.style.backgroundColor = 'transparent';
                fallback.style.color = avatarData.color;
                fallback.style.fontWeight = '600';
                img.classList.add('hidden');
                fallback.classList.remove('hidden');
            } else {
                // Not authenticated
                fallback.textContent = '👤';
                fallback.style.backgroundColor = '';
                fallback.style.color = '';
                fallback.style.fontWeight = '';
                img.classList.add('hidden');
                fallback.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to render user avatar:', error);
            fallback.textContent = '👤';
            fallback.style.backgroundColor = '';
            fallback.style.color = '';
            fallback.style.fontWeight = '';
            img.classList.add('hidden');
            fallback.classList.remove('hidden');
        }
    }

    openLoginModal() {
        const cfg = window.UI_CONFIG;
        const t = cfg?.texts?.auth || {};
        const html = `
        <!-- From Uiverse.io by gharsh11032000 -->
        <div class="form-container">
          <form id="login-form" class="form">
            <div class="form-group">
              <label for="login-username">${t.login?.label || 'Логин'}</label>
              <input
                type="text"
                id="login-username"
                name="username"
                placeholder="${t.login?.placeholder || 'Введите логин'}"
                autocomplete="username"
                required
              />
              <div id="login-error" class="field-error">
                ${t.errors?.login?.not_found || 'Пользователь не найден'}
              </div>
            </div>
            <div class="form-group">
              <label for="login-password">${t.password?.label || 'Пароль'}</label>
              <input
                type="password"
                id="login-password"
                name="password"
                placeholder="${t.password?.placeholder || 'Введите пароль'}"
                autocomplete="current-password"
                required
              />
              <div id="password-error" class="field-error"></div>
            </div>
            <div id="auth-error" class="auth-error">
              ${t.errors?.general?.auth_failed || 'Неверный логин или пароль'}
            </div>
            <div class="form-actions">
              <button class="form-submit-btn" type="submit">${t.buttons?.login || 'Войти'}</button>
              <button type="button" id="forgot-password-btn" class="forgot-password-btn">${t.buttons?.forgot_password || 'Забыли пароль?'}</button>
            </div>
          </form>
        </div>`;
        this.showModal(html);
        const form = document.getElementById('login-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            
            // Очистка предыдущих ошибок
            this.clearValidationErrors();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalSubmitText = submitBtn.textContent;
            const cfg = window.UI_CONFIG;
            const authTexts = cfg?.texts?.auth?.messages || {};
            
            // Предварительная валидация (проверка заполненности полей)
            const preliminaryValidation = this.validateAuthCredentials(username, password);
            
            if (preliminaryValidation.hasErrors) {
                this.displayValidationErrors(preliminaryValidation);
                return;
            }
            
            // Показываем состояние загрузки
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading');
            submitBtn.textContent = authTexts.loading || 'Выполняется вход...';
            
            try {
                const authResult = await window.UserStore.login(username, password);
                
                if (authResult?.ok) {
                    // Успешная авторизация
                    this.closeModal();
                    this.updateUserInterface().catch(console.warn);
                    this.openProfilePage();
                    this.showMessage(authTexts.success || 'Успешный вход в систему', 'success');
                } else {
                    // Ошибка авторизации - валидация с результатом сервера
                    const validationResult = this.validateAuthCredentials(username, password, authResult);
                    this.displayValidationErrors(validationResult);
                    
                    // Логирование ошибки авторизации
                    console.warn('Auth failed:', {
                        username: username,
                        error: authResult?.error,
                        validationResult: validationResult
                    });
                }
            } catch (error) {
                // Ошибка сети или неожиданная ошибка
                console.error('Login error:', error);
                
                const networkValidation = {
                    errors: {},
                    auth_error: cfg?.texts?.auth?.errors?.general?.network_error || 'Ошибка сети, проверьте подключение',
                    hasErrors: true
                };
                
                this.displayValidationErrors(networkValidation);
            } finally {
                // Восстанавливаем кнопку
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.textContent = originalSubmitText;
                
                // Проверка результата валидации
                this.validateUIState();
            }
        });
        
        // Обработчик для "Забыли пароль?"
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => {
                this.showForgotPasswordHelp();
            });
        }
    }

    showForgotPasswordHelp() {
        const cfg = window.UI_CONFIG;
        const t = cfg?.texts?.password_recovery || {};
        const html = `
        <div class="form-container space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">${t.title || '🔒 Восстановление пароля'}</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          
          <div class="rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
            <div class="flex items-start gap-3">
              <div class="text-amber-400 text-xl">ℹ️</div>
              <div class="flex-1">
                <div class="text-sm font-medium text-amber-200 mb-2">${t.how_to_recover || 'Как восстановирь пароль?'}</div>
                <div class="text-xs text-white/80 space-y-2">
                  <p>${t.instruction || 'Для сброса пароля обратитесь к администратору системы.'}</p>
                  <p><strong>${t.what_to_tell || 'Что сообщить администратору:'}:</strong></p>
                  <ul class="list-disc list-inside text-xs space-y-1 ml-2">
                    <li>${t.instructions?.username || 'Ваш логин (имя пользователя)'}</li>
                    <li>${t.instructions?.problem || 'Описание проблемы (забыли пароль)'}</li>
                    <li>${t.instructions?.contact_info || 'Контактную информацию для связи'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div class="rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
            <div class="flex items-start gap-3">
              <div class="text-blue-400 text-xl">👥</div>
              <div class="flex-1">
                <div class="text-sm font-medium text-blue-200 mb-2">${t.contacts_title || 'Контакты администрации'}</div>
                <div class="text-xs text-white/80">
                  <p>${t.contacts_text || 'Обратитесь к системному администратору вашей организации или IT-поддержке для получения нового пароля.'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between items-center pt-2">
            <button onclick="window.app.openLoginModal()" class="text-xs text-white/60 hover:text-white/80 underline">${t.buttons?.back_to_login || '← Назад к входу'}</button>
            <button onclick="window.app.closeModal()" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.understood || 'Понятно'}</button>
          </div>
        </div>`;
        this.showModal(html);
    }

    /**
     * Валидация данных авторизации
     * @param {string} username - Логин пользователя
     * @param {string} password - Пароль пользователя
     * @param {Object} authResult - Результат попытки авторизации
     * @returns {Object} Структурированный объект ошибок
     */
    validateAuthCredentials(username, password, authResult = null) {
        const cfg = window.UI_CONFIG;
        const errorTexts = cfg?.texts?.auth?.errors || {};
        
        const validationResult = {
            errors: {},
            auth_error: null,
            hasErrors: false
        };

        // Проверка логина
        const trimmedUsername = username ? username.trim() : '';
        if (!trimmedUsername) {
            validationResult.errors.login = {
                message: errorTexts.login?.required || 'Поле логин обязательно для заполнения',
                highlight: true
            };
            validationResult.hasErrors = true;
        } else if (trimmedUsername.length < 2) {
            validationResult.errors.login = {
                message: errorTexts.login?.invalid_format || 'Некорректный формат логина',
                highlight: true
            };
            validationResult.hasErrors = true;
        }

        // Проверка пароля
        if (!password) {
            validationResult.errors.password = {
                message: errorTexts.password?.required || 'Поле пароль обязательно для заполнения',
                highlight: true
            };
            validationResult.hasErrors = true;
        }

        // Обработка ошибок авторизации (если поля заполнены)
        if (!validationResult.hasErrors && authResult && !authResult.ok) {
            switch (authResult.error) {
                case 'not_found':
                    validationResult.errors.login = {
                        message: errorTexts.login?.not_found || 'Пользователь не найден',
                        highlight: true
                    };
                    validationResult.auth_error = errorTexts.general?.auth_failed || 'Неверный логин или пароль';
                    break;
                case 'invalid_password':
                    validationResult.errors.password = {
                        message: errorTexts.password?.invalid || 'Неверный пароль',
                        highlight: true
                    };
                    validationResult.auth_error = errorTexts.general?.auth_failed || 'Неверный логин или пароль';
                    break;
                default:
                    validationResult.auth_error = errorTexts.general?.server_error || 'Ошибка сервера, попробуйте позже';
            }
            validationResult.hasErrors = true;
        }

        return validationResult;
    }

    /**
     * Отображение ошибок валидации на форме
     * @param {Object} validationResult - Результат валидации
     */
    displayValidationErrors(validationResult) {
        // Очистка предыдущих ошибок
        this.clearValidationErrors();

        // Отображение ошибок полей
        Object.keys(validationResult.errors).forEach(fieldName => {
            const fieldError = validationResult.errors[fieldName];
            const input = document.getElementById(`login-${fieldName}`);
            const errorElement = document.getElementById(`${fieldName}-error`);

            if (input && fieldError.highlight) {
                input.classList.add('error');
            }

            if (errorElement && fieldError.message) {
                errorElement.textContent = fieldError.message;
                errorElement.classList.add('show');
            }
        });

        // Отображение общей ошибки авторизации
        if (validationResult.auth_error) {
            const authErrorElement = document.getElementById('auth-error');
            if (authErrorElement) {
                authErrorElement.textContent = validationResult.auth_error;
                authErrorElement.classList.add('show');
            }
        }
    }

    /**
     * Очистка ошибок валидации
     */
    clearValidationErrors() {
        // Очистка классов ошибок у полей
        ['login-username', 'login-password'].forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.classList.remove('error', 'success');
            }
        });

        // Очистка сообщений об ошибках
        ['login-error', 'password-error', 'auth-error'].forEach(errorId => {
            const errorElement = document.getElementById(errorId);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.remove('show');
            }
        });
    }

    /**
     * Проверка состояния UI после валидации
     */
    validateUIState() {
        const loginInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const loginError = document.getElementById('login-error');
        const passwordError = document.getElementById('password-error');
        const authError = document.getElementById('auth-error');
        
        // Проверяем корректность состояния полей и ошибок
        const validationState = {
            fields: {
                login: {
                    hasError: loginInput?.classList.contains('error') || false,
                    errorMessage: loginError?.textContent || '',
                    errorVisible: loginError?.classList.contains('show') || false
                },
                password: {
                    hasError: passwordInput?.classList.contains('error') || false,
                    errorMessage: passwordError?.textContent || '',
                    errorVisible: passwordError?.classList.contains('show') || false
                }
            },
            authError: {
                message: authError?.textContent || '',
                visible: authError?.classList.contains('show') || false
            }
        };
        
        // Логирование для отладки
        console.log('Состояние валидации UI:', validationState);
        
        return validationState;
    }

    openProfileModal(user) {
        const u = user || window.UserStore?.getCurrentUser();
        if (!u) { this.openLoginModal(); return; }
        const isSuper = (u.role === 'SuperAdmin' || u.role === 'СуперАдминистратор');
        const cfg = window.UI_CONFIG;
        const t = cfg?.texts?.user_management?.profile || {};
        const html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">${t.title || 'Личный кабинет'}</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <div class="flex items-center gap-3">
            <div class="h-16 w-16 rounded-lg overflow-hidden border border-white/10 grid place-items-center" id="profile-modal-avatar">
              <!-- Avatar will be populated by JavaScript -->
            </div>
            <div>
              <div class="text-base font-medium">${u.displayName || u.username}</div>
              <div class="text-xs text-white/60">${t.role_label || 'Роль:'} ${u.role || 'User'}</div>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button id="logout-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${t.buttons?.logout || 'Выйти'}</button>
            ${isSuper ? `<button id="admin-panel-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.admin_panel || 'Администрирование'}</button>` : ''}
          </div>
        </div>`;
        this.showModal(html);
        
    // Populate avatar in modal using module function
    updateAvatarInDOM('#profile-modal-avatar', u, { size: 'md' });
        
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await window.UserStore.logout();
            this.updateUserInterface().catch(console.warn);
            this.closeModal();
        });
        if (isSuper) {
            const btn = document.getElementById('admin-panel-btn');
            if (btn) btn.addEventListener('click', () => this.openAdminPanelModal());
        }
    }

    openProfilePage() {
        // Переключаемся на модуль profile и рендерим его
        // Гарантируем наличие модуля
        if (!this.modules.profile) {
            this.modules.profile = new ProfileModule();
        }
        // Обеспечим, что контейнер существует
        const el = document.getElementById('profile-module');
        if (!el) {
            console.error('Нет контейнера profile-module');
            return;
        }
        this.switchModule('profile').catch(error => console.error('Error switching to profile:', error));
        // Всегда повторно инициализируйте профиль, чтобы получить свежие данные (включая изображения обложек).
        this.modules.profile.init();
        const currentModuleEl = document.getElementById('current-module');
        if (currentModuleEl) currentModuleEl.textContent = window.UI_CONFIG?.texts?.user_management?.profile?.user_profile_title || 'Профиль пользователя';
    }

    async openAdminPanelModal() {
        const res = await window.UserStore.listUsers();
        const cfg = window.UI_CONFIG;
        const t = cfg?.texts?.user_management?.admin || {};
        if (!res?.ok) { this.showMessage(t.messages?.get_users_error || 'Не удалось получить список пользователей', 'error'); return; }
        const users = res.users || [];
        
        // Сгенерируйте HTML-аватар для всех пользователей
        const usersWithAvatars = await Promise.all(users.map(async u => {
          const avatarHtml = await generateAvatarHTML(u, { size: 'sm', checkFileExists: false });
          return { ...u, avatarHtml };
        }));
        
        const html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">${t.title || 'Администрирование пользователей'}</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <div class="flex justify-end gap-2">
            <button id="delete-users-toggle" class="h-9 px-3 rounded-lg border border-rose-400/20 hover:bg-rose-500/10 text-sm">${t.buttons?.delete_users || 'Удалить пользователей'}</button>
            <button id="create-user-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.create_user || 'Создать пользователя'}</button>
          </div>
          <div id="users-list" class="rounded-lg border border-white/10 divide-y divide-white/5">
            ${usersWithAvatars.map(u => `
              <div class="user-row flex items-center justify-between p-3" data-username="${u.username}">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-lg overflow-hidden border border-white/10 grid place-items-center">${u.avatarHtml}</div>
                  <div>
                    <div class="text-sm font-medium">${u.displayName}</div>
                    <div class="text-xs text-white/60">${u.username} • ${u.role}</div>
                  </div>
                </div>
                <div>
                  <button data-username="${u.username}" class="edit-user-btn h-8 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-xs">${t.buttons?.edit || 'Редактировать'}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
        this.showModal(html);
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const username = e.currentTarget.getAttribute('data-username');
                const data = await window.UserStore.getUser(username);
                if (data?.ok) this.openEditUserModal(data.user); else this.showMessage(t.messages?.user_not_found || 'Пользователь не найден', 'error');
            });
        });
        document.getElementById('create-user-btn').addEventListener('click', () => this.openCreateUserModal());

        // Delete mode controls
        const usersListEl = document.getElementById('users-list');
        const toggleBtn = document.getElementById('delete-users-toggle');
        let deleteMode = false;
        const toDelete = new Set();

        const rebindEditHandlers = () => {
          usersListEl.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const username = e.currentTarget.getAttribute('data-username');
              const data = await window.UserStore.getUser(username);
              if (data?.ok) this.openEditUserModal(data.user); else this.showMessage(t.messages?.user_not_found || 'Пользователь не найден', 'error');
            });
          });
        };

        const enterDeleteMode = () => {
          deleteMode = true;
          toDelete.clear();
          usersListEl.querySelectorAll('.user-row').forEach(row => {
            row.classList.add('ring-1','ring-rose-400/20','bg-rose-500/5');
            const username = row.getAttribute('data-username');
            const btn = row.querySelector('.edit-user-btn, .delete-user-btn');
            if (btn) {
              // Очистим прежние обработчики, создадим новый узел кнопки (clone)
              const newBtn = btn.cloneNode(true);
              btn.replaceWith(newBtn);
              newBtn.textContent = t.buttons?.delete || 'Удалить';
              newBtn.classList.remove('edit-user-btn');
              newBtn.classList.add('delete-user-btn','border-rose-400/30');
              newBtn.setAttribute('data-username', username);
              newBtn.addEventListener('click', () => {
                if (toDelete.has(username)) return; // уже помечен
                toDelete.add(username);
                row.classList.add('bg-rose-500/20');
                // Плавное скрытие строки
                const rect = row.getBoundingClientRect();
                row.style.height = rect.height + 'px';
                row.style.overflow = 'hidden';
                row.style.transition = 'height 220ms ease, opacity 220ms ease, transform 220ms ease';
                row.style.willChange = 'height, opacity, transform';
                // force reflow
                void row.offsetHeight;
                row.style.height = '0px';
                row.style.opacity = '0';
                row.style.transform = 'scale(0.98)';
                const onEnd = () => {
                  row.classList.add('hidden');
                  row.removeEventListener('transitionend', onEnd);
                };
                row.addEventListener('transitionend', onEnd);
              });
            }
          });
          toggleBtn.textContent = t.buttons?.accept_changes || 'Принять изменения';
          toggleBtn.classList.remove('border-rose-400/20','hover:bg-rose-500/10');
          toggleBtn.classList.add('border-emerald-400/30','hover:bg-emerald-500/10');
          // add cancel button
          if (!document.getElementById('cancel-delete-users')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-delete-users';
            cancelBtn.className = 'h-9 px-3 rounded-lg border border-emerald-400/40 hover:bg-emerald-500/10 text-sm text-emerald-200';
            cancelBtn.textContent = t.buttons?.cancel || 'Отменить';
            toggleBtn.parentElement.insertBefore(cancelBtn, toggleBtn);
            cancelBtn.addEventListener('click', exitDeleteMode);
          }
        };

        const exitDeleteMode = () => {
          deleteMode = false;
          toDelete.clear();
          usersListEl.querySelectorAll('.user-row').forEach(row => {
            row.classList.remove('ring-1','ring-rose-400/20','bg-rose-500/5','bg-rose-500/20');
            if (row.classList.contains('hidden')) {
              row.classList.remove('hidden');
              // Плавное восстановление
              row.style.transition = 'height 220ms ease, opacity 220ms ease, transform 220ms ease';
              row.style.willChange = 'height, opacity, transform';
              row.style.height = '0px';
              row.style.opacity = '0';
              row.style.transform = 'scale(0.98)';
              // force reflow
              void row.offsetHeight;
              row.style.height = '';
              row.style.opacity = '';
              row.style.transform = '';
              setTimeout(() => {
                row.style.transition = '';
                row.style.willChange = '';
                row.style.height = '';
                row.style.overflow = '';
              }, 210);
            }
            const btn = row.querySelector('.delete-user-btn, .edit-user-btn');
            if (btn) {
              // Пересоздаем кнопку, чтобы очистить обработчики
              const newBtn = btn.cloneNode(true);
              btn.replaceWith(newBtn);
              newBtn.textContent = t.buttons?.edit || 'Редактировать';
              newBtn.classList.remove('delete-user-btn','border-rose-400/30');
              newBtn.classList.add('edit-user-btn');
            }
          });
          toggleBtn.textContent = t.buttons?.delete_users || 'Удалить пользователей';
          toggleBtn.classList.remove('border-emerald-400/30','hover:bg-emerald-500/10');
          toggleBtn.classList.add('border-rose-400/20','hover:bg-rose-500/10');
          const cancelBtn = document.getElementById('cancel-delete-users');
          if (cancelBtn) cancelBtn.remove();
          rebindEditHandlers();
        };

        toggleBtn.addEventListener('click', async () => {
          if (!deleteMode) {
            enterDeleteMode();
          } else {
            if (toDelete.size === 0) { exitDeleteMode(); return; }
            // Модальное подтверждение удаления
            const confirmHtml = `
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-lg font-semibold">${t.confirm_delete?.title || 'Подтверждение удаления'}</div>
                  <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
                </div>
                <div class="text-sm text-white/80">${(t.confirm_delete?.message || 'Вы уверены, что хотите удалить выбранных пользователей ({count})? Это действие необратимо.').replace('{count}', toDelete.size)}</div>
                <div class="flex justify-end gap-2">
                  <button id="delete-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${t.confirm_delete?.buttons?.cancel || 'Отмена'}</button>
                  <button id="delete-confirm" class="h-9 px-3 rounded-lg border border-rose-400/30 hover:bg-rose-500/10 text-sm text-rose-200">${t.confirm_delete?.buttons?.confirm || 'Да, удалить'}</button>
                </div>
              </div>`;
            this.showModal(confirmHtml);
            const onCancel = () => { this.closeModal(); };
            const onConfirm = async () => {
              let allOk = true;
              for (const username of Array.from(toDelete)) {
                try { const r = await window.UserStore.deleteUser(username); if (!r?.ok) allOk = false; } catch { allOk = false; }
              }
              this.closeModal();
              if (allOk) this.showMessage(t.messages?.users_deleted || 'Пользователи удалены', 'success'); else this.showMessage(t.messages?.partial_delete_error || 'Часть пользователей удалить не удалось', 'error');
              this.openAdminPanelModal();
            };
            document.getElementById('delete-cancel').addEventListener('click', onCancel);
            document.getElementById('delete-confirm').addEventListener('click', onConfirm);
          }
        });

        // Initial binding for edit buttons already set above
    }

    openEditUserModal(user) {
        const html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">Редактирование пользователя</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <form id="edit-user-form" class="space-y-3">
            <div>
              <div class="text-xs text-white/60 mb-1">Логин (username)</div>
              <input id="eu-username" value="${user.username}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" readonly>
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
              <input id="eu-display" value="${user.displayName || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Роль</div>
              <select id="eu-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
                <option ${user.role==='User'?'selected':''}>User</option>
                <option ${user.role==='Admin'?'selected':''}>Admin</option>
                <option ${user.role==='SuperAdmin' || user.role==='СуперАдминистратор'?'selected':''}>SuperAdmin</option>
              </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-white/60 mb-1">E‑mail</div>
                <input id="eu-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Телефон</div>
                <input id="eu-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Отдел</div>
                <input id="eu-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Должность</div>
                <input id="eu-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" id="edit-user-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
              <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Сохранить</button>
            </div>
          </form>
        </div>`;
        this.showModal(html);
        document.getElementById('edit-user-cancel').addEventListener('click', () => { this.openAdminPanelModal(); });
        // Загрузим текущие данные пользователя и заполним поля
        (async () => {
            try {
                const userRes = await window.UserStore.getUser(user.username);
                const userInfo = userRes?.ok ? (userRes.user || {}) : {};
                const emailEl = document.getElementById('eu-email'); if (emailEl) emailEl.value = userInfo.email || '';
                const phoneEl = document.getElementById('eu-phone'); if (phoneEl) phoneEl.value = userInfo.phone || '';
                const depEl = document.getElementById('eu-department'); if (depEl) depEl.value = userInfo.department || '';
                const posEl = document.getElementById('eu-position'); if (posEl) posEl.value = userInfo.position || '';
            } catch (_) {}
        })();
        document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('eu-username').value;
            const displayName = document.getElementById('eu-display').value;
            const role = document.getElementById('eu-role').value;
            const email = document.getElementById('eu-email').value.trim();
            const phone = document.getElementById('eu-phone').value.trim();
            const department = document.getElementById('eu-department').value.trim();
            const position = document.getElementById('eu-position').value.trim();
            const res = await window.UserStore.saveUser(username, { displayName, role });
            const infoSave = await window.UserStore.saveUser(username, { email, phone, department, position });
            if (res?.ok) {
                const current = window.UserStore.getCurrentUser();
                if (current && current.username === username) {
                    // обновим сессию
                    window.UserStore.setCurrentUser({ ...current, displayName, role });
                    this.updateUserInterface().catch(console.warn);
                }
                if (infoSave?.ok) this.showMessage('Сохранено', 'success'); else this.showMessage('Данные сохранены, но данные пользователя не обновлены', 'error');
                this.openAdminPanelModal();
            } else {
                this.showMessage('Не удалось сохранить', 'error');
            }
        });
    }

    openRequestChangesModal() {
        const currentUser = window.UserStore?.getCurrentUser();
        const html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">Запрос изменения данных</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <form id="request-changes-form" class="space-y-3">
            <div>
              <div class="text-xs text-white/60 mb-1">Логин (username)</div>
              <input id="rc-username" value="${currentUser?.username || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" readonly>
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
              <input id="rc-display" value="${currentUser?.displayName || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Роль</div>
              <select id="rc-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
                <option ${currentUser?.role==='User'?'selected':''}>User</option>
                <option ${currentUser?.role==='Admin'?'selected':''}>Admin</option>
                <option ${currentUser?.role==='SuperAdmin' || currentUser?.role==='СуперАдминистратор'?'selected':''}>SuperAdmin</option>
              </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-white/60 mb-1">E‑mail</div>
                <input id="rc-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Телефон</div>
                <input id="rc-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Отдел</div>
                <input id="rc-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Должность</div>
                <input id="rc-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" id="request-changes-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
              <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Отправить</button>
            </div>
          </form>
        </div>`;
        this.showModal(html);
        
        // Загружаем текущие данные пользователя
        if (currentUser?.username) {
            window.UserStore.getUser(currentUser.username).then(userRes => {
                if (userRes?.ok && userRes.user) {
                    const userInfo = userRes.user;
                    const emailEl = document.getElementById('rc-email');
                    const phoneEl = document.getElementById('rc-phone');
                    const depEl = document.getElementById('rc-department');
                    const posEl = document.getElementById('rc-position');
                    
                    if (emailEl) emailEl.value = userInfo.email || '';
                    if (phoneEl) phoneEl.value = userInfo.phone || '';
                    if (depEl) depEl.value = userInfo.department || '';
                    if (posEl) posEl.value = userInfo.position || '';
                }
            });
        }
        
        const cancelRequest = document.getElementById('request-changes-cancel');
        if (cancelRequest) cancelRequest.addEventListener('click', () => { this.closeModal(); });
        
        document.getElementById('request-changes-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            // TODO: Здесь будет логика отправки запроса на изменение данных
            this.showMessage('Запрос отправлен', 'success');
            this.closeModal();
        });
    }

    openCreateUserModal() {
        const html = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">Создание пользователя</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <form id="create-user-form" class="space-y-3">
            <div>
              <div class="text-xs text-white/60 mb-1">Логин (username)</div>
              <input id="cu-username" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="username">
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Пароль</div>
              <input id="cu-password" type="password" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="••••••••">
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
              <input id="cu-display" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Имя">
            </div>
            <div>
              <div class="text-xs text-white/60 mb-1">Роль</div>
              <select id="cu-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
                <option selected>User</option>
                <option>Admin</option>
                <option>SuperAdmin</option>
              </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-white/60 mb-1">E‑mail</div>
                <input id="cu-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Телефон</div>
                <input id="cu-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Отдел</div>
                <input id="cu-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
              </div>
              <div>
                <div class="text-xs text-white/60 mb-1">Должность</div>
                <input id="cu-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" id="create-user-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
              <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Создать</button>
            </div>
          </form>
        </div>`;
        this.showModal(html);
        const cancelCreate = document.getElementById('create-user-cancel');
        if (cancelCreate) cancelCreate.addEventListener('click', () => { this.openAdminPanelModal(); });
        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('cu-username').value.trim();
            const password = document.getElementById('cu-password').value;
            const displayName = document.getElementById('cu-display').value.trim();
            const role = document.getElementById('cu-role').value;
            const email = document.getElementById('cu-email').value.trim();
            const phone = document.getElementById('cu-phone').value.trim();
            const department = document.getElementById('cu-department').value.trim();
            const position = document.getElementById('cu-position').value.trim();
            const res = await window.UserStore.createUser({ username, password, displayName, role, email, phone, department, position });
            if (res?.ok) {
                this.showMessage('Пользователь создан', 'success');
                this.openAdminPanelModal();
            } else {
                this.showMessage('Не удалось создать пользователя', 'error');
            }
        });
    }

    loadDashboardData() {
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

    toggleNotifications() {
        const panel = document.getElementById('notifications-panel');
        panel.classList.toggle('hidden');
        
        if (!panel.classList.contains('hidden')) {
            this.loadNotifications();
        }
    }

    loadNotifications() {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');
        
        // Загружаем уведомления из базы данных
        const db = new Database();
        db.getNotifications({ unread: true }).then(notifications => {
            notificationCount.textContent = notifications.length;
            
            if (notifications.length === 0) {
                const emptyText = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.notifications && window.UI_CONFIG.texts.notifications.empty) || 'Нет новых уведомлений';
                notificationsList.innerHTML = `<div class="no-notifications">${emptyText}</div>`;
                return;
            }

            notificationsList.innerHTML = notifications.map(notification => `
                <div class="notification-item" data-id="${notification.id}">
                    <div class="notification-header">
                        <span class="notification-title">${notification.title}</span>
                        <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
                    </div>
                    <div class="notification-message">${notification.message}</div>
                </div>
            `).join('');

            // Добавляем обработчики для уведомлений
            notificationsList.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', () => {
                    const notificationId = item.dataset.id;
                    this.markNotificationAsRead(notificationId);
                });
            });
        });
    }

    markNotificationAsRead(notificationId) {
        const db = new Database();
        db.updateNotification(notificationId, { read: true }).then(() => {
            this.loadNotifications();
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const t = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.time) || {};
        if (diff < 60000) return t.just_now || 'Только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}${t.minutes_ago_suffix || ' мин назад'}`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t.hours_ago_suffix || ' ч назад'}`;
        return date.toLocaleDateString();
    }

    async openSettings() {
        // Рендерим модальное окно через Nunjucks, но шаблон держим inline
        const nunjucks = require('nunjucks');
        const { ipcRenderer } = require('electron');
        const env = new nunjucks.Environment(new nunjucks.PrecompiledLoader({}), { autoescape: true });

        const cfg = window.UI_CONFIG;
        const baseTpl = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.title) || (cfg.texts && cfg.texts.buttons && cfg.texts.buttons.settings) || 'Настройки'}</div>
            <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
          </div>
          <div class="space-y-3">
            <div class="text-sm text-white/70">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.version_label) || 'Версия'}: {{ version }}</div>
            <div class="grid grid-cols-1 gap-3">
              <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span class="text-sm">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.notifications) || 'Уведомления'}</span>
                <input type="checkbox" id="notifications-enabled" {% if settings.notifications %}checked{% endif %}>
              </label>
              <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <span class="text-sm">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.autosave) || 'Автосохранение'}</span>
                <input type="checkbox" id="autosave-enabled" {% if settings.autosave %}checked{% endif %}>
              </label>
              <div class="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div class="text-xs text-white/60 mb-1">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.db_path) || 'Путь к базе данных'}</div>
                <input class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-1.5" id="db-path" value="" readonly>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button onclick="window.app.closeModal()" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${cfg.texts.buttons.cancel}</button>
            <button onclick="window.app.saveSettings && window.app.saveSettings()" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${cfg.texts.buttons.save}</button>
          </div>
        </div>`;

        env.addTemplate('settings_inline.html', baseTpl);
        const html = env.render('settings_inline.html', {
            version: await ipcRenderer.invoke('get-app-version'),
            user: { name: 'Администратор', role: 'admin' },
            settings: { notifications: true, autosave: true }
        });
        this.showModal(html);

        try {
            const dbPath = await this.getDatabasePath();
            const input = document.getElementById('db-path');
            if (input) input.value = dbPath || '';
        } catch (e) {
            console.error('Не удалось получить путь к БД', e);
        }
    }

    showModal(content) {
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    async getDatabasePath() {
        const { ipcRenderer } = require('electron');
        return await ipcRenderer.invoke('get-app-path');
    }

    openFile() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.invoke('dialog:open-file').then(filePath => {
            if (filePath) {
                console.log('Выбран файл:', filePath);
                // Здесь будет логика загрузки файла
            }
        }).catch(err => console.error('Ошибка открытия файла:', err));
    }

    // Утилиты
    showMessage(message, type = 'info') {
        // Показ сообщений пользователю
        const typesText = (window.UI_CONFIG && window.UI_CONFIG.texts && window.UI_CONFIG.texts.notifications && window.UI_CONFIG.texts.notifications.types) || {};
        const notification = {
            id: Date.now(),
            title: type === 'error' ? (typesText.error || 'Ошибка') : type === 'success' ? (typesText.success || 'Успешно') : (typesText.info || 'Информация'),
            message: message,
            type: type,
            createdAt: new Date().toISOString()
        };

        this.notifications.unshift(notification);
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        document.getElementById('notification-count').textContent = unreadCount;
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Импорт загрузчика модулей асинхронно
    try {
        // Гарантируем, что загрузчик модулей доступен
        if (!window.loadModules) {
            console.log('Импорт загрузчика модулей...');
            const moduleLoader = await import('./module-loader.js');
            console.log('✓ Загрузчик модулей загружен');
        }
    } catch (error) {
        console.error('Ошибка загрузки модуля-загрузчика:', error);
    }
    
    // Создание экземпляра приложения
    window.app = new ProcessCraftApp();
    
    // Настраиваем объект modules для глобального доступа
    if (!window.app.modules) {
        window.app.modules = {};
    }
    
    // Настраиваем глобальную функцию для безопасного доступа к модулям
    window.getModule = function(moduleName) {
        return window.app && window.app.modules && window.app.modules[moduleName] ? window.app.modules[moduleName] : null;
    };
    
    // Глобальный ремонт пустых Lucide-иконок
    window.repairLucideIcons = (root) => {
        try {
            const scope = root || document;
            const nodes = scope.querySelectorAll('svg[data-lucide]');
            nodes.forEach(el => {
                const name = el.getAttribute('data-lucide');
                const hasContent = el.innerHTML && el.innerHTML.trim().length > 0;
                if (hasContent) return;
                const lib = window.lucide && window.lucide.icons;
                if (!lib || !lib[name] || typeof lib[name].toSvg !== 'function') return;
                const strokeWidth = el.getAttribute('stroke-width') || 1.5;
                const width = el.getAttribute('width');
                const height = el.getAttribute('height');
                const cls = el.getAttribute('class');
                const svgString = lib[name].toSvg({ 'stroke-width': strokeWidth });
                const tmp = document.createElement('div');
                tmp.innerHTML = svgString;
                const newSvg = tmp.firstElementChild;
                if (!newSvg) return;
                if (cls) newSvg.setAttribute('class', cls);
                if (width) newSvg.setAttribute('width', width);
                if (height) newSvg.setAttribute('height', height);
                el.replaceWith(newSvg);
            });
        } catch (e) {
            console.warn('repairLucideIcons error:', e);
        }
    };

    // Мгновенно починить иконки при первой загрузке
    try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
        }
        if (typeof window.repairLucideIcons === 'function') window.repairLucideIcons(document);
    } catch (e) { console.warn('Initial Lucide repair warn:', e); }

    // Наблюдатель за DOM: автоматически чинит добавленные data-lucide
    try {
        const mo = new MutationObserver((mutations) => {
            let shouldRepair = false;
            for (const m of mutations) {
                if (m.type === 'childList') {
                    if (m.addedNodes && m.addedNodes.length) {
                        for (const n of m.addedNodes) {
                            if (!(n instanceof Element)) continue;
                            if (n.matches && n.matches('svg[data-lucide]')) { shouldRepair = true; break; }
                            if (n.querySelector && n.querySelector('svg[data-lucide]')) { shouldRepair = true; break; }
                        }
                    }
                }
                if (shouldRepair) break;
            }
            if (shouldRepair) {
                try {
                    if (window.lucide && typeof window.lucide.createIcons === 'function') {
                        window.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
                    }
                } catch (_) {}
                if (typeof window.repairLucideIcons === 'function') window.repairLucideIcons(document);
            }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        window.__lucideObserver = mo;
    } catch (e) {
        console.warn('MutationObserver for Lucide failed:', e);
    }
});

// Экспорт для ES6 модулей
export default ProcessCraftApp;

// Глобальная доступность для совместимости
window.ProcessCraftApp = ProcessCraftApp;

