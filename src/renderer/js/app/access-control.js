// Система контроля доступа на основе ролей пользователей
// Реализация функций для управления доступом в приложении ProcessCraft

const { ipcRenderer } = require('electron');

// Глобальная переменная для хранения конфигурации доступа
let accessConfig = null;
let currentUser = null;

/**
 * Загрузка конфигурации доступа через IPC
 * @returns {Promise<Object|null>} Конфигурация доступа
 */
async function loadAccessConfig() {
    try {
        console.log('[AccessControl] Загрузка конфигурации доступа');
        
        // Загружаем конфигурацию через IPC
        const result = await ipcRenderer.invoke('access:loadConfig');
        
        if (result && result.ok && result.config) {
            accessConfig = result.config;
            return accessConfig;
        } else {
            console.error('[AccessControl] Ошибка загрузки конфигурации доступа:', result?.error);
            return null;
        }
    } catch (error) {
        console.error('[AccessControl] Ошибка загрузки конфигурации доступа:', error);
        return null;
    }
}

/**
 * Инициализация системы контроля доступа
 * @param {Object} app Экземпляр приложения
 * @returns {Promise<boolean>} Результат инициализации
 */
export async function initializeAccessControl(app) {
    try {
        console.log('[AccessControl] Инициализация системы контроля доступа');
        
        // Загружаем конфигурацию доступа
        const config = await loadAccessConfig();
        
        if (!config) {
            console.error('[AccessControl] Не удалось загрузить конфигурацию доступа');
            return false;
        }
        
        // Если в конфигурации отсутствует секция access или в ней нет ключей для ролей — инициализируем
        try {
            // Убедимся, что roles — это массив строк
            const roles = Array.isArray(config.roles) ? config.roles.filter(r => typeof r === 'string') : [];

            // Нормализуем существующую секцию access — гарантируем объект
            const existingAccess = (config.access && typeof config.access === 'object') ? Object.assign({}, config.access) : {};

            // Соберём объект с недостающими ролями (только ключи которые отсутствуют)
            const missing = {};
            roles.forEach(r => {
                if (!Object.prototype.hasOwnProperty.call(existingAccess, r)) {
                    missing[r] = [];
                }
            });

            // Если есть недостающие роли — отправим update в main-process и обновим локальную переменную
            if (Object.keys(missing).length > 0) {
                const payload = {
                    markers: config.markers || {},
                    addedMarkers: [],
                    removedMarkers: [],
                    access: Object.assign({}, existingAccess, missing)
                };

                try {
                    await ipcRenderer.invoke('access:updateMarkers', payload);
                    // Обновим локальную переменную accessConfig — объединяя существующие access с добавленными ролями
                    accessConfig = Object.assign({}, config, { access: Object.assign({}, existingAccess, missing) });
                } catch (e) {
                    console.warn('[AccessControl] Не удалось отправить обновлённую секцию access на main-process:', e);
                    // Даже если не удалось сохранить на main, всё равно обновим локальную конфигурацию в памяти
                    accessConfig = Object.assign({}, config, { access: Object.assign({}, existingAccess, missing) });
                }
            } else {
                // Ничего не нужно добавлять — используем существующую конфигурацию
                accessConfig = config;
            }
        } catch (e) {
            console.warn('[AccessControl] Ошибка при проверке/инициализации секции access:', e);
            accessConfig = config;
        }
        
    // Сохраняем ссылку на приложение
    window.ProcessCraftAppInstance = app;
        
        // Настраиваем наблюдатель за изменениями DOM для автоматического обновления маркеров
        setupDOMChangeObserver(app);

        // После настройки наблюдателя и загрузки конфигурации — инициируем одноразовый сбор маркеров
        // и отправку в main-process, чтобы при старте программы файл access.json был обновлён.
        try {
            // Небольшая задержка для релиза начальной разметки в DOM
            setTimeout(() => {
                try { updateAccessMarkers(app); } catch (e) { console.warn('[AccessControl] initial updateAccessMarkers failed:', e); }
            }, 150);
        } catch (e) {
            console.warn('[AccessControl] cannot schedule initial updateAccessMarkers:', e);
        }
        
        console.log('[AccessControl] Система контроля доступа успешно инициализирована');
        return true;
    } catch (error) {
        console.error('[AccessControl] Ошибка инициализации системы контроля доступа:', error);
        return false;
    }
}

/**
 * Применение прав доступа к элементам интерфейса
 * @param {Object} app Экземпляр приложения
 */
export function applyAccessRules(app) {
    try {
        console.log('[AccessControl] Применение прав доступа к элементам интерфейса');
        
        // Если конфигурация не загружена, ничего не делаем
        if (!accessConfig) {
            console.warn('[AccessControl] Конфигурация доступа не загружена');
            return;
        }
        
        // Если пользователь не установлен, скрываем все элементы с маркерами
        if (!currentUser) {
            hideAllMarkedElements();
            return;
        }
        
        // Получаем разрешенные маркеры для текущей роли пользователя
        const allowedMarkers = accessConfig.access[currentUser.role] || [];
        
        // Применяем правила доступа к элементам (удаляем элементы без доступа)
        applyAccessToElements(allowedMarkers);
    } catch (error) {
        console.error('[AccessControl] Ошибка применения прав доступа:', error);
    }
}

/**
 * Обновление маркеров доступа
 * @param {Object} app Экземпляр приложения
 */
export async function updateAccessMarkers(app) {
    try {
        console.log('[AccessControl] Обновление маркеров доступа');
        
        // Попытаемся получить текущие маркеры из документа, с retry на случай гонки DOM
        let currentMarkers = getDocumentMarkers();
        let attempts = 0;
        while (currentMarkers.length === 0 && attempts < 3) {
            attempts += 1;
            console.warn(`[AccessControl] Скан маркеров вернул пустой результат, попытка ${attempts} из 3 — подождём 150ms и попробуем снова`);
            // eslint-disable-next-line no-await-in-loop
            const delay = ms => new Promise(res => setTimeout(res, ms));
            // eslint-disable-next-line no-await-in-loop
            await delay(150);
            currentMarkers = getDocumentMarkers();
        }
        if (currentMarkers.length === 0) {
            console.warn('[AccessControl] Скан маркеров вернулся пустым после всех попыток');
            try {
                console.warn('[AccessControl] Скан маркеров пуст, выполняем финальную попытку через requestAnimationFrame');
                await new Promise((resolve) => requestAnimationFrame(resolve));
                currentMarkers = getDocumentMarkers();
                console.log('[AccessControl] currentMarkers (after rAF):', currentMarkers);
            } catch (e) {
                console.warn('[AccessControl] Финальная попытка requestAnimationFrame упала:', e);
            }
        }
        console.log('[AccessControl] currentMarkers (raw):', currentMarkers);

        // Сравниваем по id — accessConfig.markers может быть массивом или объектом
        const existingMarkersRaw = accessConfig?.markers || [];
        const existingKeys = Array.isArray(existingMarkersRaw) ? existingMarkersRaw : Object.keys(existingMarkersRaw || {});

    const currentIds = currentMarkers.map(m => m.id);

        // Вычисляем добавленные и удаленные маркеры (по id)
        const newMarkers = currentIds.filter(id => !existingKeys.includes(id));

        // Защита от ложных удалений: если текущий снимок пуст, но на диске уже есть маркеры,
        // то это может быть результатом того, что элементы были удалены до сканирования.
        // В таком случае не отправляем удалённые маркеры.
        let removedMarkers = [];
        if (currentIds.length === 0 && existingKeys.length > 0) {
            console.warn('[AccessControl] Текущий снимок маркеров пуст, пропускаем отправку удалённых маркеров чтобы избежать массовой очистки');
        } else {
            removedMarkers = existingKeys.filter(id => !currentIds.includes(id));
        }

        console.log('[AccessControl] computed newMarkers:', newMarkers, 'removedMarkers:', removedMarkers);

        // Если есть изменения, обновляем конфигурацию через IPC
        if (newMarkers.length > 0 || removedMarkers.length > 0) {
            updateMarkersViaIPC(currentMarkers, newMarkers, removedMarkers);
        }
    } catch (error) {
        console.error('[AccessControl] Ошибка обновления маркеров:', error);
    }
}

/**
 * Установка текущего пользователя в системе контроля доступа
 * @param {Object} app Экземпляр приложения
 * @param {Object} user Данные пользователя
 */
export function setCurrentUser(app, user) {
    try {
        console.log(`[AccessControl] Установка текущего пользователя: ${user?.username} (${user?.role})`);
        
        // Устанавливаем текущего пользователя
        currentUser = user;
        
        // Применяем правила доступа
        applyAccessRules(app);
    } catch (error) {
        console.error('[AccessControl] Ошибка установки текущего пользователя:', error);
    }
}

/**
 * Проверка доступа к элементу по маркеру
 * @param {string} marker Маркер доступа
 * @returns {boolean} Результат проверки доступа
 */
export function checkAccess(marker) {
    try {
        // Если конфигурация не загружена, разрешаем доступ
        if (!accessConfig) {
            console.warn('[AccessControl] Конфигурация доступа не загружена, доступ разрешен по умолчанию');
            return true;
        }
        
        // Если пользователь не установлен, запрещаем доступ
        if (!currentUser) {
            return false;
        }
        
        // Получаем разрешенные маркеры для текущей роли пользователя
        const allowedMarkers = accessConfig.access[currentUser.role] || [];
        
        // Проверяем, есть ли маркер в списке разрешенных
        return allowedMarkers.includes(marker);
    } catch (error) {
        console.error('[AccessControl] Ошибка проверки доступа:', error);
        return true; // По умолчанию разрешаем доступ в случае ошибки
    }
}

/**
 * Получение всех маркеров из документа
 * @returns {Array<string>} Массив маркеров
 */
function getDocumentMarkers() {
    try {
        // Получаем все элементы с атрибутом data-access-marker и собираем расширенные данные
        const markerElements = document.querySelectorAll('[data-access-marker]');
        const markers = [];

        // Собираем уникальные маркеры с дополнительными атрибутами
        markerElements.forEach(element => {
            const marker = element.getAttribute('data-access-marker');
            if (!marker) return;

            // description
            let description = element.getAttribute('data-access-description');
            if (!description) {
                // если описания нет — ставим маркер для последующей записи
                description = 'Требует заполнения';
                element.setAttribute('data-access-description', description);
            }

            // down — маркер, к которому этот элемент должен быть вложен
            const down = element.getAttribute('data-access-down') || null;

            // Добавляем объект маркера, избегая дублирования
            if (!markers.some(m => m.id === marker)) {
                markers.push({ id: marker, description, down, children: [] });
            }
        });

        return markers;
    } catch (error) {
        console.error('[AccessControl] Ошибка получения маркеров из документа:', error);
        return [];
    }
}

/**
 * Построить иерархическую структуру маркеров по полю down.
 * markers — массив объектов { id, description, down, children }
 */
function buildMarkersHierarchy(markers) {
    const map = new Map();
    markers.forEach(m => map.set(m.id, { id: m.id, description: m.description, children: [] }));

    // Собираем корневые ноды
    const roots = [];

    markers.forEach(m => {
        if (m.down && map.has(m.down)) {
            // вложаем узел под родителя
            map.get(m.down).children.push(map.get(m.id));
        } else {
            roots.push(map.get(m.id));
        }
    });

    // Превращаем в объект вида { markerId: { description, children: [...] } }
    const out = {};
    const writeNode = (node) => ({ description: node.description, children: node.children.map(c => writeNode(c)) });
    roots.forEach(r => { out[r.id] = writeNode(r); });
    return out;
}

/**
 * Применение прав доступа к элементам интерфейса
 * @param {Array<string>} allowedMarkers Разрешенные маркеры
 */
function applyAccessToElements(allowedMarkers) {
    try {
        // Получаем все элементы с атрибутом data-access-marker
        const markerElements = document.querySelectorAll('[data-access-marker]');

        // Применяем правила доступа к каждому элементу.
        // Если доступ запрещён — удаляем элемент из DOM, чтобы пользователь не мог его использовать.
        markerElements.forEach(element => {
            const marker = element.getAttribute('data-access-marker');

            if (allowedMarkers.includes(marker)) {
                // разрешено — ничего не делаем (элемент остаётся в DOM)
                return;
            }

            try {
                element.remove();
                console.log(`[AccessControl] Удалён элемент с маркером: ${marker}`);
            } catch (e) {
                // Как запасной вариант — скрываем, если remove() по какой-то причине не сработал
                element.style.display = 'none';
                element.classList.add('access-hidden');
                // Диагностический лог — сколько найдено элементов (помогает отследить гонки вставки)
                try {
                    const ids = Array.from(markerElements).slice(0, 10).map(el => el.getAttribute('data-access-marker'));
                    console.log('[AccessControl] getDocumentMarkers: found', markerElements.length, 'elements, sample ids:', ids);
                } catch (e) {
                    console.log('[AccessControl] getDocumentMarkers: failed to serialize elements for log', e);
                }
                console.warn('[AccessControl] Не удалось удалить элемент, скрыт вместо удаления:', e);
            }
        });
    } catch (error) {
        console.error('[AccessControl] Ошибка применения прав доступа к элементам:', error);
    }
}

/**
 * Скрытие всех элементов с маркерами (для неавторизованных пользователей)
 */
function hideAllMarkedElements() {
    try {
        // Получаем все элементы с атрибутом data-access-marker
        const markerElements = document.querySelectorAll('[data-access-marker]');

        // Удаляем все элементы с маркерами (для неавторизованных пользователей)
        markerElements.forEach(element => {
            try { element.remove(); } catch (e) { element.style.display = 'none'; element.classList.add('access-hidden'); }
        });
    } catch (error) {
        console.error('[AccessControl] Ошибка скрытия элементов:', error);
    }
}

/**
 * Обновление маркеров через IPC
 * @param {Array<string>} markers Все текущие маркеры
 * @param {Array<string>} addedMarkers Добавленные маркеры
 * @param {Array<string>} removedMarkers Удаленные маркеры
 */
async function updateMarkersViaIPC(markers, addedMarkers, removedMarkers) {
    try {
        console.log(`[AccessControl] Обновление маркеров через IPC: добавлено ${addedMarkers.length}, удалено ${removedMarkers.length}`);
        // Построим иерархию маркеров с описаниями
        const hierarchy = buildMarkersHierarchy(markers);

        // Если иерархия пустая — не отправляем, это защищает от удаления всех маркеров
        if (!hierarchy || Object.keys(hierarchy).length === 0) {
            console.warn('[AccessControl] Пустая иерархия маркеров — отправка пропущена');
            return;
        }

        // Отправляем обновлённую структуру маркеров через IPC
        try {
            console.log('[AccessControl] hierarchy to send:', JSON.stringify(hierarchy, null, 2), 'addedMarkers:', addedMarkers, 'removedMarkers:', removedMarkers);
        } catch (e) {
            console.log('[AccessControl] hierarchy to send (non-serializable):', hierarchy, 'addedMarkers:', addedMarkers, 'removedMarkers:', removedMarkers);
        }

        const result = await ipcRenderer.invoke('access:updateMarkers', {
            markers: hierarchy,
            addedMarkers,
            removedMarkers
        });
        
        if (result && result.ok) {
            console.log('[AccessControl] Маркеры успешно обновлены');
            
            // Перезагружаем конфигурацию доступа
            await loadAccessConfig();
        } else {
            console.error('[AccessControl] Ошибка обновления маркеров:', result?.error);
        }
    } catch (error) {
        console.error('[AccessControl] Ошибка обновления маркеров через IPC:', error);
    }
}

// Экспорт хелпера: возвращает снимок текущих маркеров (иерархия) — удобно вызывать из DevTools
window.exportAccessMarkersSnapshot = function() {
    try {
        const markers = getDocumentMarkers();
        const hierarchy = buildMarkersHierarchy(markers);
        return { markersList: markers, hierarchy };
    } catch (e) {
        console.error('[AccessControl] exportAccessMarkersSnapshot failed:', e);
        return null;
    }
};

/**
 * Настраиваем наблюдатель за изменениями DOM для автоматического обновления маркеров
 * @param {Object} app Экземпляр приложения
 */
function setupDOMChangeObserver(app) {
    try {
        // Создаем наблюдатель за изменениями DOM
        const observer = new MutationObserver((mutations) => {
            let shouldUpdateMarkers = false;
            
            // Проверяем, были ли добавлены или удалены элементы с маркерами
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Проверяем добавленные узлы
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                                // Если добавился элемент с маркером — пометим для обновления маркеров
                                if (node.hasAttribute && node.hasAttribute('data-access-marker')) {
                                    shouldUpdateMarkers = true;
                                }

                                // Проверяем дочерние элементы
                                const markerElements = node.querySelectorAll && node.querySelectorAll('[data-access-marker]');
                                if (markerElements && markerElements.length > 0) {
                                    shouldUpdateMarkers = true;
                                }

                                // Немедленно применим правила доступа к добавленному узлу,
                                // чтобы элементы без прав были удалены сразу при вставке.
                                try {
                                    if (!accessConfig) return;
                                    if (!currentUser) {
                                        // У пользователя нет аккаунта — удаляем все найденные маркер-элементы внутри узла
                                        if (node.hasAttribute && node.hasAttribute('data-access-marker')) {
                                            try { node.remove(); } catch (e) { node.style.display = 'none'; }
                                        }
                                        if (markerElements && markerElements.length > 0) {
                                            markerElements.forEach(el => { try { el.remove(); } catch (e) { el.style.display = 'none'; } });
                                        }
                                    } else {
                                        const allowed = accessConfig.access[currentUser.role] || [];
                                        // Проверяем сам узел
                                        if (node.hasAttribute && node.hasAttribute('data-access-marker')) {
                                            const m = node.getAttribute('data-access-marker');
                                            if (!allowed.includes(m)) {
                                                try { node.remove(); } catch (e) { node.style.display = 'none'; }
                                            }
                                        }
                                        // Проверяем дочерние элементы
                                        if (markerElements && markerElements.length > 0) {
                                            markerElements.forEach(el => {
                                                const mm = el.getAttribute('data-access-marker');
                                                if (!allowed.includes(mm)) {
                                                    try { el.remove(); } catch (e) { el.style.display = 'none'; }
                                                }
                                            });
                                        }
                                    }
                                } catch (e) {
                                    console.warn('[AccessControl] Ошибка при немедленном применении прав к добавленному узлу:', e);
                                }
                        }
                    });
                    
                    // Проверяем удаленные узлы
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Проверяем сам элемент
                            if (node.hasAttribute && node.hasAttribute('data-access-marker')) {
                                shouldUpdateMarkers = true;
                            }
                            
                            // Проверяем дочерние элементы
                            const markerElements = node.querySelectorAll && node.querySelectorAll('[data-access-marker]');
                            if (markerElements && markerElements.length > 0) {
                                shouldUpdateMarkers = true;
                            }
                        }
                    });
                }
            }
            
            // Если были изменения маркеров, обновляем конфигурацию
            if (shouldUpdateMarkers) {
                setTimeout(() => {
                    updateAccessMarkers(app);
                }, 100); // Небольшая задержка для группировки изменений
            }
        });
        
        // Начинаем наблюдение за изменениями в документе
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('[AccessControl] Наблюдатель за изменениями DOM настроен');
    } catch (error) {
        console.error('[AccessControl] Ошибка настройки наблюдателя за изменениями DOM:', error);
    }
}

// Экспорт объекта по умолчанию для совместимости
export default {
    initializeAccessControl,
    applyAccessRules,
    updateAccessMarkers,
    setCurrentUser,
    checkAccess
};

console.log('[AccessControl] Модуль системы контроля доступа загружен');