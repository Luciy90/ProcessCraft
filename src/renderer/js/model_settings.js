
// Извлечено из src/renderer/templates/model_settings.html
// Обеспечивает инициализацию модального окна настроек (списки пользователей / модулей)
export function initModelSettings() {
  try {
    const overlay       = document.getElementById('settingsModal');
    if (!overlay) return; // nothing to do if template not present
    // ничего не делать, если шаблон отсутствует
    const openBtn       = document.getElementById('sidebar-settings');
    const closeBtn      = document.getElementById('closeModal'); // может отсутствовать
    const cancelBtn     = document.getElementById('cancel');
    const usersScroll   = () => overlay.querySelector('.model-settings-users-list-scroll');
    const modulesScroll = () => overlay.querySelector('.model-settings-modules-list-scroll');

    // Read users from local Server/users directory (Electron) or via fetch fallback (browser).
    // Чтение пользователей из локальной директории Server/users (Electron) или через fetch fallback (браузер).
    const readUsersFromServer = async () => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const usersDir = path.join(process.cwd(), 'Server', 'users');

          const entries = fs.readdirSync(usersDir, { withFileTypes: true });
          const users = [];

          for (const e of entries) {
            if (!e.isDirectory()) continue;
            const name = e.name;
            // skip obvious temp/template folders
            // пропустить очевидные временные/шаблонные папки
            if (name.startsWith('.') || name.startsWith('_') || /template|temp|backup/i.test(name)) continue;

            const folder = path.join(usersDir, name);
            let userJson = {};
            let infoJson = {};

            try {
              const u = fs.readFileSync(path.join(folder, 'user.json'), 'utf8');
              userJson = JSON.parse(u);
            } catch (_) {}

            try {
              const i = fs.readFileSync(path.join(folder, 'info.json'), 'utf8');
              infoJson = JSON.parse(i);
            } catch (_) {}

            const displayName = userJson.displayName || userJson.username || name;
            const position = infoJson.position || infoJson.role || '';

            // Include avatarPath in user data
            // Включаем avatarPath в данные пользователя
            users.push({ 
              name: displayName, 
              role: position,
              username: userJson.username || name,
              avatarPath: userJson.avatarPath || null
            });
          }

          return users;
        } else {
          // Browser fallback - try to fetch index or each folder (best-effort)
          // Резервный вариант для браузера - попытка получить индекс или каждую папку (наилучшие усилия)
          try {
            const resp = await fetch('/Server/users/index.json');
            if (resp.ok) {
              const idx = await resp.json();
              if (Array.isArray(idx)) {
                const users = await Promise.all(idx.map(async name => {
                  try {
                    const [uRes, iRes] = await Promise.all([
                      fetch(`/Server/users/${name}/user.json`),
                      fetch(`/Server/users/${name}/info.json`)
                    ]);
                    const u = uRes.ok ? await uRes.json() : {};
                    const ii = iRes.ok ? await iRes.json() : {};
                    return { 
                      name: u.displayName || name, 
                      role: ii.position || '',
                      username: u.username || name,
                      avatarPath: u.avatarPath || null
                    };
                  } catch (_) { return null; }
                }));
                return users.filter(Boolean);
              }
            }
          } catch (_) {}

          return [];
        }
      } catch (e) {
        console.warn('readUsersFromServer error:', e);
        return [];
      }
    };

    // Получить список модулей из ModuleLoader / реестра. Предпочтение listModules(), затем реестр, затем ожидание события загрузки.
    const getModulesFromLoader = async () => {
      try {
        if (typeof window.listModules === 'function') {
          const mods = window.listModules();
          if (Array.isArray(mods) && mods.length) return mods.map(m => m.name || m.id);
        }

        if (window.moduleRegistry && typeof window.moduleRegistry.entries === 'function') {
          const arr = [];
          for (const [id, info] of window.moduleRegistry) {
            arr.push((info && info.meta && info.meta.moduleName) ? info.meta.moduleName : id);
          }
          if (arr.length) return arr;
        }

        // Ожидание события modules:loaded (резервный вариант с коротким таймаутом)
        const mods = await new Promise(resolve => {
          const handler = e => {
            try {
              const list = (e.detail && e.detail.success) ? e.detail.success.map(m => (m.meta && m.meta.moduleName) ? m.meta.moduleName : m.id) : [];
              document.removeEventListener('modules:loaded', handler);
              resolve(list);
            } catch (err) {
              document.removeEventListener('modules:loaded', handler);
              resolve([]);
            }
          };
          document.addEventListener('modules:loaded', handler);
          // резервный таймаут
          setTimeout(() => { document.removeEventListener('modules:loaded', handler); resolve([]); }, 400);
        });

        return mods || [];
      } catch (e) {
        console.warn('getModulesFromLoader error:', e);
        return [];
      }
    };

    const fetchData = async () => {
      const [users, modules] = await Promise.all([readUsersFromServer(), getModulesFromLoader()]);
      return { users, modules };
    };

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

    // Создать пользовательский переключатель
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
      const { users, modules } = await fetchData();

      // users
      // пользователи
      usersScroll().innerHTML = users.map(u => `
        <button class="user-row group w-full text-left p-3 flex items-center gap-3 transition-all duration-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 active:scale-[0.99]">
          <div class="h-9 w-9 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 hover:bg-white/5 grid place-items-center">
            <!-- Display user avatar or fallback to initials -->
            <!-- Отображение аватара пользователя или резервный вариант с инициалами -->
            ${u.avatarPath ? 
              `<img src="${u.avatarPath}" alt="${u.name}" class="h-9 w-9 object-cover" onerror="this.parentNode.innerHTML='<div class=\'h-8 w-8 rounded-full bg-gradient-to-b from-white/20 to-white/5 grid place-items-center text-[11px] text-white/90 border border-white/10\'>' + (function(name) { const parts = name.trim().split(' '); const first = parts[0]?.[0] || ''; const last = parts[1]?.[0] || ''; return (first + last).toUpperCase(); })('${u.name}') + '</div>';">` :
              `<div class="h-9 w-9 grid place-items-center text-sm text-white/80">
                ${initials(u.name)}
              </div>`
            }
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

  // modules: заблокируем несколько (оранжевый замок) — если модулей нет, оставим список пустым
  const lockedSet = new Set([1, 3]); // индексы заблокированных по умолчанию
  modulesScroll().innerHTML = (modules || []).map((m, i) => moduleToggleGroup(m, lockedSet.has(i))).join('');

      lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });

      // Поведение выбора пользователя
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

      // Реакция иконки блокировки (оранжевая при блокировке)
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

        // инициализация и прослушивание
        applyLockState();
        lockToggle.addEventListener('change', applyLockState);
      });
    };

    // слушатели
    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener && closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal(); });

    // первоначальный рендер иконок
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