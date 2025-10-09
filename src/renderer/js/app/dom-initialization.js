// Инициализация DOM
// Содержит методы для инициализации приложения при загрузке DOM

/**
 * Инициализация приложения при загрузке DOM
 */
export async function initializeDOM() {
    // Импорт загрузчика модулей асинхронно
    try {
        // Гарантируем, что загрузчик модулей доступен
        if (!window.loadModules) {
            console.log('Импорт загрузчика модулей...');
            const moduleLoader = await import('../module-loader.js');
            console.log('✓ Загрузчик модулей загружен');
        }
    } catch (error) {
        console.error('Ошибка загрузки модуля-загрузчика:', error);
    }
    
    // Применяем политику безопасности: для неавторизованных пользователей не загружаем
    // блок с id="settingsModal" и кнопку с id="sidebar-settings"
    applySecurityPolicy();
    
    // Создание экземпляра приложения
    window.app = new ProcessCraftApp();
    
    // Инициализация приложения
    try {
        await window.app.init();
        console.log('✓ Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
    }
    
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
    } catch (e) { console.warn('Предупреждение о первоначальном восстановлении Lucide:', e); }

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
        console.warn('Ошибка MutationObserver для Lucide:', e);
    }
}

/**
 * Применяет политику безопасности для элементов настроек
 * Удаляет элементы настроек из DOM для неавторизованных пользователей
 */
function applySecurityPolicy() {
    try {
        // Проверяем, загружен ли UserStore
        if (typeof window.UserStore === 'undefined') {
            // Если UserStore еще не загружен, загружаем его
            import('../utils/userStore.js').then(() => {
                // Повторно вызываем applySecurityPolicy после загрузки UserStore
                applySecurityPolicy();
            }).catch(error => {
                console.warn('Ошибка загрузки userStore:', error);
                // В случае ошибки загрузки userStore, удаляем элементы настроек в целях безопасности
                removeSettingsElements();
            });
            return;
        }
        
        // Получаем текущего пользователя
        const currentUser = window.UserStore.getCurrentUser();
        
        // Если пользователь не авторизован, удаляем элементы настроек из DOM
        if (!currentUser) {
            removeSettingsElements();
        }
    } catch (error) {
        console.warn('Ошибка применения политики безопасности:', error);
        // В случае ошибки, удаляем элементы настроек в целях безопасности
        removeSettingsElements();
    }
}

/**
 * Удаляет элементы настроек из DOM
 */
function removeSettingsElements() {
    // Удаляем модальное окно настроек
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.remove();
        console.log('Модальное окно настроек удалено из DOM для неавторизованного пользователя');
    }
    
    // Удаляем кнопку настроек в сайдбаре
    const sidebarSettings = document.getElementById('sidebar-settings');
    if (sidebarSettings) {
        sidebarSettings.remove();
        console.log('Кнопка настроек в сайдбаре удалена из DOM для неавторизованного пользователя');
    }
}