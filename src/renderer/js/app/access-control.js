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
            console.log('[AccessControl] Конфигурация доступа успешно загружена');
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
        
        // Сохраняем ссылку на приложение
        window.ProcessCraftAppInstance = app;
        
        // Настраиваем наблюдатель за изменениями DOM для автоматического обновления маркеров
        setupDOMChangeObserver(app);
        
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
        
        // Применяем правила доступа к элементам
        applyAccessToElements(allowedMarkers);
    } catch (error) {
        console.error('[AccessControl] Ошибка применения прав доступа:', error);
    }
}

/**
 * Обновление маркеров доступа
 * @param {Object} app Экземпляр приложения
 */
export function updateAccessMarkers(app) {
    try {
        console.log('[AccessControl] Обновление маркеров доступа');
        
        // Получаем текущие маркеры из документа
        const currentMarkers = getDocumentMarkers();
        
        // Проверяем, есть ли новые или удаленные маркеры
        const existingMarkers = accessConfig?.markers || [];
        const newMarkers = currentMarkers.filter(marker => !existingMarkers.includes(marker));
        const removedMarkers = existingMarkers.filter(marker => !currentMarkers.includes(marker));
        
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
        // Получаем все элементы с атрибутом data-access-marker
        const markerElements = document.querySelectorAll('[data-access-marker]');
        const markers = [];
        
        // Собираем уникальные маркеры
        markerElements.forEach(element => {
            const marker = element.getAttribute('data-access-marker');
            if (marker && !markers.includes(marker)) {
                markers.push(marker);
            }
        });
        
        return markers;
    } catch (error) {
        console.error('[AccessControl] Ошибка получения маркеров из документа:', error);
        return [];
    }
}

/**
 * Применение прав доступа к элементам интерфейса
 * @param {Array<string>} allowedMarkers Разрешенные маркеры
 */
function applyAccessToElements(allowedMarkers) {
    try {
        // Получаем все элементы с атрибутом data-access-marker
        const markerElements = document.querySelectorAll('[data-access-marker]');
        
        // Применяем правила доступа к каждому элементу
        markerElements.forEach(element => {
            const marker = element.getAttribute('data-access-marker');
            
            // Проверяем, разрешен ли доступ к этому элементу
            if (allowedMarkers.includes(marker)) {
                // Показываем элемент
                element.style.display = '';
                element.classList.remove('access-hidden');
            } else {
                // Скрываем элемент
                element.style.display = 'none';
                element.classList.add('access-hidden');
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
        
        // Скрываем все элементы
        markerElements.forEach(element => {
            element.style.display = 'none';
            element.classList.add('access-hidden');
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
        
        // Отправляем обновленный список маркеров через IPC
        const result = await ipcRenderer.invoke('access:updateMarkers', {
            markers,
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