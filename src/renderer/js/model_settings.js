// Extracted from src/renderer/templates/model_settings.html
// Provides initialization for the settings modal UI (users / modules lists)
export function initModelSettings() {
  try {
    const overlay       = document.getElementById('settingsModal');
    if (!overlay) return; // nothing to do if template not present
    const openBtn       = document.getElementById('sidebar-settings');
    const closeBtn      = document.getElementById('closeModal'); // может отсутствовать
    const cancelBtn     = document.getElementById('cancel');
    const usersScroll   = () => overlay.querySelector('.model-settings-users-list-scroll');
    const modulesScroll = () => overlay.querySelector('.model-settings-modules-list-scroll');

    const fakeFetch = () => new Promise(res => setTimeout(() => res({
      users: [
        { name: 'Алексей Смирнов',   role: 'Продуктовый дизайнер' },
        { name: 'Елена Иванова',     role: 'Менеджер проектов' },
        { name: 'Дмитрий Кузнецов',  role: 'Разработчик фронтенда' },
        { name: 'Мария Петрова',     role: 'Аналитик данных' },
        { name: 'Иван Соколов',      role: 'Бэкенд‑разработчик' },
        { name: 'Ольга Фёдорова',    role: 'HR‑специалист' }
      ],
      modules: [
        'Аналитика',
        'Отчёты',
        'Уведомления',
        'Администрирование',
        'Интеграции',
        'Каталог'
      ]
    }), 200));

    const openModal = () => {
      overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      loadData();
    };

    const closeModal = () => {
      overlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };

    const initials = (name) => {
      const parts = name.trim().split(' ');
      const first = parts[0]?.[0] || '';
      const last  = parts[1]?.[0] || '';
      return (first + last).toUpperCase();
    };

    // Build custom switch
    const buildToggle = ({ checked = false, inputClasses = '' } = {}) => `
      <label class="model-settings-switch">
        <input type="checkbox" class="${inputClasses}" ${checked ? 'checked' : ''}>
        <div class="model-settings-slider">
          <div class="model-settings-circle">
            <svg data-lucide="cross" class="model-settings-cross" width="6" height="6"></svg>
            <svg data-lucide="checkmark" class="model-settings-checkmark" width="10" height="10"></svg>
          </div>
        </div>
      </label>
    `;

    // Модуль: один ряд (имя + 3 тумблера) в гриде для выравнивания под маркеры
    const moduleToggleGroup = (m, locked = false) => {
      return `
        <div class="module-row p-4 hover:bg-white/5 transition-colors"
              style="display:grid; grid-template-columns: minmax(0,1fr) auto auto auto; column-gap: 1.5rem; align-items:center;">
          <div class="flex items-center gap-3 min-w-0">
            <svg data-lucide="grip-vertical" class="h-4 w-4 text-white/40 shrink-0 cursor-grab active:cursor-grabbing" aria-label="Перетащить" role="img"></svg>
            <svg data-lucide="${locked ? 'lock' : 'unlock'}" class="h-4 w-4 ${locked ? 'text-orange-400' : 'text-white/60'} lock-indicator shrink-0"></svg>
            <span class="text-sm truncate">${m}</span>
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: true,  inputClasses: 'toggle-visible' })}
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: locked, inputClasses: 'toggle-lock' })}
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: true,  inputClasses: 'toggle-enable' })}
          </div>
        </div>
      `;
    };

    const loadData = async () => {
      const { users, modules } = await fakeFetch();

      // users
      usersScroll().innerHTML = users.map(u => `
        <button class="user-row group w-full text-left p-3 flex items-center gap-3 transition-all duration-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 active:scale-[0.99]">
          <div class="relative shrink-0">
            <div class="h-8 w-8 rounded-full bg-gradient-to-b from-white/20 to-white/5 grid place-items-center text-[11px] text-white/90 border border-white/10">
              ${initials(u.name)}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-white/90 truncate">
              ${u.name}
              <span class="text-xs text-white/50 font-normal pl-2">· ${u.role}</span>
            </div>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg data-lucide="chevron-right" class="h-4 w-4 text-white/40"></svg>
          </div>
        </button>
      `).join('');

      // modules: заблокируем несколько (оранжевый замок)
      const lockedSet = new Set([1, 3]); // индексы заблокированных по умолчанию
      modulesScroll().innerHTML = modules.map((m, i) => moduleToggleGroup(m, lockedSet.has(i))).join('');

      lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });

      // User select behavior
      const userRows = usersScroll().querySelectorAll('.user-row');
      let currentSelected = null;

      userRows.forEach(row => {
        row.addEventListener('click', () => {
          if (currentSelected) {
            currentSelected.classList.remove(
              'bg-emerald-500/10',
              'ring-1',
              'ring-emerald-400/30',
              'border-emerald-400/40',
              'shadow-[0_0_0_3px_rgba(16,185,129,0.15)_inset]'
            );
          }
          row.classList.add(
            'bg-emerald-500/10',
            'ring-1',
            'ring-emerald-400/30',
            'border-emerald-400/40',
            'shadow-[0_0_0_3px_rgba(16,185,129,0.15)_inset]'
          );
          row.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.01)' }, { transform: 'scale(1)' }],
            { duration: 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
          currentSelected = row;
          userRows.forEach(r => r.setAttribute('aria-selected', r === row ? 'true' : 'false'));
        });
      });

      // Lock icon reaction (orange on lock)
      modulesScroll().querySelectorAll('.module-row').forEach(row => {
        const lockToggle = row.querySelector('input.toggle-lock');
        const lockIcon   = row.querySelector('.lock-indicator');

        const applyLockState = () => {
          if (lockToggle.checked) {
            lockIcon.setAttribute('data-lucide', 'lock');
            lockIcon.classList.remove('text-white/60');
            lockIcon.classList.add('text-orange-400');
          } else {
            lockIcon.setAttribute('data-lucide', 'unlock');
            lockIcon.classList.remove('text-orange-400');
            lockIcon.classList.add('text-white/60');
          }
          lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
        };

        // init and listen
        applyLockState();
        lockToggle.addEventListener('change', applyLockState);
      });
    };

    // listeners
    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener && closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal(); });

    // initial icon render
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => lucide.createIcons({ attrs: { 'stroke-width': 1.5 } }));
    } else {
      try { lucide.createIcons({ attrs: { 'stroke-width': 1.5 } }); } catch (_) {}
    }
  } catch (e) {
    console.warn('initModelSettings error:', e);
  }
}

export default { initModelSettings };