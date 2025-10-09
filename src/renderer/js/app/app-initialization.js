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
            console.log('Шаблон model-settings.html загружен и вставлен');
                    
            // Попытка импортировать ES-модуль и инициализировать
            try {
                const mod = await import('./model-settings.js');
                if (mod && typeof mod.initModelSettings === 'function') {
                    mod.initModelSettings();
                    console.log('initModelSettings вызван');
                } else if (mod && mod.default && typeof mod.default.initModelSettings === 'function') {
                    mod.default.initModelSettings();
                    console.log('initModelSettings вызван из экспорта по умолчанию');
                } else {
                    console.warn('model-settings module loaded but initModelSettings not found');
                }
            } catch (e) {
                console.warn('Не удалось импортировать или вызвать модуль model-settings:', e);
            }
        } catch (e) {
            // Неприменимо в некоторых окружениях (CSP, file://, Electron packaging). Это не фатально.
            console.warn('Не удалось загрузить шаблон model-settings:', e);
        }
    })();
    
    // Настраиваем обработчики навигации после рендеринга
    app.setupNavigationListeners();
    
    // Активируем модуль dashboard по умолчанию
    app.switchModule('dashboard').catch(error => console.error('Ошибка переключения на панель управления:', error));
    
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
                        try { app.setCurrentUser(currentUser); } catch (e) { console.warn('Ошибка app.setCurrentUser:', e); }
                    } else if (window.AppAccess && typeof window.AppAccess.setCurrentUser === 'function') {
                        try { window.AppAccess.setCurrentUser(app, currentUser); } catch (e) { console.warn('Ошибка AppAccess.setCurrentUser:', e); }
                    } else {
                        console.warn('Нет доступного setCurrentUser для установки текущего пользователя в системе контроля доступа');
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
                        console.log('initModelSettings вызван для существующих элементов');
                    }
                }
            } catch (e) {
                console.warn('Не удалось инициализировать model-settings для существующих элементов:', e);
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
        console.log('Шаблон model-settings.html загружен и вставлен для авторизованного пользователя');
                
        // Инициализируем настройки
        try {
            const mod = await import('./model-settings.js');
            if (mod && typeof mod.initModelSettings === 'function') {
                mod.initModelSettings();
                window.modelSettingsInitialized = true;
                console.log('initModelSettings вызван для авторизованного пользователя');
            }
        } catch (e) {
            console.warn('Не удалось инициализировать model-settings для авторизованного пользователя:', e);
        }
    } catch (e) {
        console.warn('Не удалось добавить элементы настроек для пользователя:', e);
    }
}