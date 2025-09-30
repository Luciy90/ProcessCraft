// Рендеринг интерфейса приложения
// Содержит методы для рендеринга UI на основе конфигурации

/**
 * Рендеринг интерфейса из конфигурации
 * @param {Object} app Экземпляр приложения
 */
export function renderChromeFromConfig(app) {
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
    app.setupNavigationListeners();
}