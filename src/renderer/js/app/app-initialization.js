// Инициализация приложения ProcessCraft
// Содержит основную логику инициализации приложения

/**
 * Инициализация приложения
 */
export async function initializeApp(app) {
    app.renderChromeFromConfig();
    app.setupEventListeners();
    
    // Обработчик событий загрузки модулей
    document.addEventListener('modules:loaded', async (e) => {
        console.log('✓ Получено событие modules:loaded', e.detail);
        app.onModulesLoaded(e.detail);
    });
    
    // Инициализация модулей
    await app.initializeModules(); 
    
    // Попытка подгрузить и вставить шаблон модального окна настроек (templates/model-settings.html)
    // Защищённо: если fetch или вставка неудачны — продолжаем без фатальной ошибки.
    (async () => {
        try {
            // Проверяем, авторизован ли пользователь перед загрузкой настроек
            const currentUser = window.UserStore?.getCurrentUser();
            if (!currentUser) {
                console.log('Пользователь не авторизован, пропускаем загрузку настроек');
                return;
            }
            
            const tplPath = 'js/../templates/model-settings.html';
            const res = await fetch(tplPath, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
            const html = await res.text();
            // Вставляем в body в конец — шаблон содержит свой <script> с поведением, поэтому он выполнится после вставки
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container);
            console.log('Template model-settings.html loaded and inserted');
                    
            // Попытка импортировать ES-модуль и инициализировать
            try {
                const mod = await import('./model-settings.js');
                if (mod && typeof mod.initModelSettings === 'function') {
                    mod.initModelSettings();
                    console.log('initModelSettings invoked');
                } else if (mod && mod.default && typeof mod.default.initModelSettings === 'function') {
                    mod.default.initModelSettings();
                    console.log('initModelSettings invoked from default export');
                } else {
                    console.warn('model-settings module loaded but initModelSettings not found');
                }
            } catch (e) {
                console.warn('Failed to import or invoke model-settings module:', e);
            }
        } catch (e) {
            // Неприменимо в некоторых окружениях (CSP, file://, Electron packaging). Это не фатально.
            console.warn('Could not load model-settings template:', e);
        }
    })();
    
    // Настраиваем обработчики навигации после рендеринга
    app.setupNavigationListeners();
    
    // Активируем модуль dashboard по умолчанию
    app.switchModule('dashboard').catch(error => console.error('Error switching to dashboard:', error));
    
    // Инициализируем систему контроля доступа
    if (typeof app.initializeAccessControl === 'function') {
        app.initializeAccessControl(app).then(success => {
            if (success) {
                console.log('Система контроля доступа успешно инициализирована');
                
                // Устанавливаем текущего пользователя в системе контроля доступа
                const currentUser = window.UserStore?.getCurrentUser();
                if (currentUser) {
                    // Prefer instance method if available
                    if (typeof app.setCurrentUser === 'function') {
                        try { app.setCurrentUser(currentUser); } catch (e) { console.warn('app.setCurrentUser failed:', e); }
                    } else if (window.AppAccess && typeof window.AppAccess.setCurrentUser === 'function') {
                        try { window.AppAccess.setCurrentUser(app, currentUser); } catch (e) { console.warn('AppAccess.setCurrentUser failed:', e); }
                    } else {
                        console.warn('No setCurrentUser available to set current user in access control');
                    }
                }
                
                // Применяем права доступа
                if (typeof app.applyAccessRules === 'function') {
                    app.applyAccessRules(app);
                }
            } else {
                console.error('Ошибка инициализации системы контроля доступа');
            }
        }).catch(error => {
            console.error('Ошибка инициализации системы контроля доступа:', error);
        });
    }
    
    console.log('ProcessCraft приложение инициализировано');
    
    // Тестирование переключения модулей (можно удалить после проверки)
    app.testModuleSwitching();
}

/**
 * Добавляет элементы настроек в DOM для авторизованного пользователя
 */
export async function addSettingsElementsForUser() {
    try {
        // Проверяем, существуют ли уже элементы настроек
        const existingSettingsModal = document.getElementById('settingsModal');
        const existingSidebarSettings = document.getElementById('sidebar-settings');
        
        if (existingSettingsModal && existingSidebarSettings) {
            // Элементы уже существуют, инициализируем настройки если они еще не инициализированы
            try {
                // Проверяем, инициализированы ли настройки
                if (typeof window.modelSettingsInitialized === 'undefined' || !window.modelSettingsInitialized) {
                    const mod = await import('./model-settings.js');
                    if (mod && typeof mod.initModelSettings === 'function') {
                        mod.initModelSettings();
                        window.modelSettingsInitialized = true;
                        console.log('initModelSettings invoked for existing elements');
                    }
                }
            } catch (e) {
                console.warn('Failed to initialize model-settings for existing elements:', e);
            }
            return;
        }
        
        // Загружаем шаблон настроек
        const tplPath = 'js/../templates/model-settings.html';
        const res = await fetch(tplPath, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
        const html = await res.text();
        
        // Вставляем в body в конец
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        console.log('Template model-settings.html loaded and inserted for authorized user');
                
        // Инициализируем настройки
        try {
            const mod = await import('./model-settings.js');
            if (mod && typeof mod.initModelSettings === 'function') {
                mod.initModelSettings();
                window.modelSettingsInitialized = true;
                console.log('initModelSettings invoked for authorized user');
            }
        } catch (e) {
            console.warn('Failed to initialize model-settings for authorized user:', e);
        }
    } catch (e) {
        console.warn('Could not add settings elements for user:', e);
    }
}