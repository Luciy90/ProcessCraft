
// Извлечено из src/renderer/templates/model-settings.html
// Обеспечивает инициализацию модального окна настроек (списки пользователей / модулей)
import { generateAvatarHTML } from './utils/avatarUtils.js';

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

    // Temporary instructions storage
    let tempInstructions = {};
    
    // Currently selected user
    let selectedUser = null;
    
    // All users access data
    let allUsersAccessData = {};

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
              const i = fs.readFileSync(path.join(folder, 'user.json'), 'utf8');
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
                      fetch(`/Server/users/${name}/user.json`)
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
      // Clear temporary instructions when closing modal
      tempInstructions = {};
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

    // Update the moduleToggleGroup function to accept visible state
    const moduleToggleGroup = (m, locked = false, enabled = true, visible = true) => {
      return `
        <div class="module-row p-4 hover:bg-white/5 transition-colors"
              style="display:grid; grid-template-columns: minmax(0,1fr) auto auto auto; column-gap: 1.5rem; align-items:center;">
          <div class="flex items-center gap-3 min-w-0">
            <svg data-lucide="grip-vertical" class="h-4 w-4 text-white/40 shrink-0 cursor-grab active:cursor-grabbing" aria-label="Перетащить" role="img"></svg>
            <svg data-lucide="${locked ? 'lock' : 'unlock'}" class="h-4 w-4 ${locked ? 'text-orange-400' : 'text-white/60'} lock-indicator shrink-0"></svg>
            <span class="text-sm truncate">${m}</span>
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: visible,  inputClasses: 'toggle-visible' })}
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: locked, inputClasses: 'toggle-lock' })}
          </div>
          <div class="flex justify-center">
            ${buildToggle({ checked: enabled,  inputClasses: 'toggle-enable' })}
          </div>
        </div>
      `;
    };

    const loadData = async () => {
      const { users, modules } = await fetchData();

      // users — рендерим асинхронно используя centralized avatar utils
      // пользователи
      const userNodes = await Promise.all(users.map(async u => {
        // generate avatar HTML (uses UserStore checks internally)
        const avatarHtml = await generateAvatarHTML({ username: u.username, displayName: u.name, avatarPath: u.avatarPath }, { size: 'sm' });

        return `
        <button class="user-row group w-full text-left p-3 flex items-center gap-3 transition-all duration-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 active:scale-[0.99]" data-username="${u.username}">
          <div class="h-9 w-9 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 hover:bg-white/5 grid place-items-center">
            ${avatarHtml}
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
      `;
      }));

      usersScroll().innerHTML = userNodes.join('');

      // Read module enable states from index.json
      const moduleStates = await getModuleStates();

      // Get module names from index.json to ensure correct mapping
      const indexModuleNames = Object.keys(moduleStates);

      // Load access data for all users
      allUsersAccessData = {};
      for (const user of users) {
        allUsersAccessData[user.username] = await getUserAccessData(user.username);
      }

      // Select first user by default
      if (users.length > 0) {
        selectedUser = users[0].username;
      }

      // Get current user access data (with temp instructions applied)
      const currentUserAccess = getCurrentUserAccessData(selectedUser, indexModuleNames);

      // modules: заблокируем несколько (оранжевый zamок) — если модулей нет, оставим список пустым
      modulesScroll().innerHTML = indexModuleNames.map((moduleName) => {
        // Get enable state for this module
        const isEnabled = moduleStates[moduleName] !== undefined ? moduleStates[moduleName] : true;
        
        // Get access data for this module for the selected user
        const moduleAccess = currentUserAccess[moduleName] || { visible: true, lock: false };
        
        return moduleToggleGroup(moduleName, moduleAccess.lock, isEnabled, moduleAccess.visible);
      }).join('');

      lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });

      // Поведение выбора пользователя
      const userRows = usersScroll().querySelectorAll('.user-row');
      let currentSelected = null;

      userRows.forEach(row => {
        row.addEventListener('click', async () => {
          // Get username from data attribute
          const username = row.getAttribute('data-username');
          
          if (!username) return;
          
          if (currentSelected) {
            currentSelected.classList.remove('selected-user');
          }
          row.classList.add('selected-user');
          currentSelected = row;
          userRows.forEach(r => r.setAttribute('aria-selected', r === row ? 'true' : 'false'));
          
          // Switch to the selected user
          await switchUser(username, moduleStates, indexModuleNames);
        });
      });

      // Реакция иконки блокировки (оранжевая при блокировке)
      modulesScroll().querySelectorAll('.module-row').forEach(row => {
        const lockToggle = row.querySelector('input.toggle-lock');
        const visibleToggle = row.querySelector('input.toggle-visible');
        const moduleNameElement = row.querySelector('span.truncate');
        
        if (!lockToggle || !visibleToggle || !moduleNameElement) return;
        
        const moduleName = moduleNameElement.textContent;

        // Lock toggle handler
        const lockIcon = row.querySelector('.lock-indicator');
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

        // Store temporary instruction when toggles change
        lockToggle.addEventListener('change', () => {
          applyLockState();
          storeTempInstruction(selectedUser, moduleName, 'lock', lockToggle.checked);
        });
        
        visibleToggle.addEventListener('change', () => {
          storeTempInstruction(selectedUser, moduleName, 'visible', visibleToggle.checked);
        });

        // инициализация и прослушивание
        applyLockState();
      });
    };

    // Function to switch to a different user
    const switchUser = async (username, moduleStates, moduleNames) => {
      // Save current user's temporary instructions
      // (They're already stored in tempInstructions)
      
      // Switch to new user
      selectedUser = username;
      
      // Get current user access data (with temp instructions applied)
      const currentUserAccess = getCurrentUserAccessData(selectedUser, moduleNames);
      
      // Update module toggles with the new user's access data
      updateModuleToggles(currentUserAccess, moduleStates, moduleNames);
    };

    // Function to get current user access data with temp instructions applied
    const getCurrentUserAccessData = (username, moduleNames) => {
      // Start with the user's actual access data
      const userData = allUsersAccessData[username] || {};
      
      // Apply temporary instructions
      const result = {};
      for (const moduleName of moduleNames) {
        result[moduleName] = userData[moduleName] || { visible: true, lock: false };
        
        // Check if there are temp instructions for this user/module
        if (tempInstructions[username] && tempInstructions[username][moduleName]) {
          const instructions = tempInstructions[username][moduleName];
          if (instructions.hasOwnProperty('visible')) {
            result[moduleName].visible = instructions.visible;
          }
          if (instructions.hasOwnProperty('lock')) {
            result[moduleName].lock = instructions.lock;
          }
        }
      }
      
      return result;
    };

    // Function to store temporary instruction
    const storeTempInstruction = (username, moduleName, property, value) => {
      if (!tempInstructions[username]) {
        tempInstructions[username] = {};
      }
      if (!tempInstructions[username][moduleName]) {
        tempInstructions[username][moduleName] = {};
      }
      tempInstructions[username][moduleName][property] = value;
    };

    // Function to update module toggles with user access data
    const updateModuleToggles = (userAccessData, moduleStates, moduleNames) => {
      modulesScroll().innerHTML = moduleNames.map((moduleName) => {
        // Get enable state for this module
        const isEnabled = moduleStates[moduleName] !== undefined ? moduleStates[moduleName] : true;
        
        // Get access data for this module for the selected user
        const moduleAccess = userAccessData[moduleName] || { visible: true, lock: false };
        
        return moduleToggleGroup(moduleName, moduleAccess.lock, isEnabled, moduleAccess.visible);
      }).join('');
      
      lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
      
      // Re-attach event listeners for toggles
      modulesScroll().querySelectorAll('.module-row').forEach(row => {
        const lockToggle = row.querySelector('input.toggle-lock');
        const visibleToggle = row.querySelector('input.toggle-visible');
        const moduleNameElement = row.querySelector('span.truncate');
        
        if (!lockToggle || !visibleToggle || !moduleNameElement) return;
        
        const moduleName = moduleNameElement.textContent;

        // Lock toggle handler
        const lockIcon = row.querySelector('.lock-indicator');
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

        // Store temporary instruction when toggles change
        lockToggle.addEventListener('change', () => {
          applyLockState();
          storeTempInstruction(selectedUser, moduleName, 'lock', lockToggle.checked);
        });
        
        visibleToggle.addEventListener('change', () => {
          storeTempInstruction(selectedUser, moduleName, 'visible', visibleToggle.checked);
        });

        applyLockState();
      });
    };

    // Function to read user access data from accessToModules.json
    const getUserAccessData = async (username) => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const accessPath = path.join(process.cwd(), 'Server', 'users', username, 'accessToModules.json');
          
          if (fs.existsSync(accessPath)) {
            const data = fs.readFileSync(accessPath, 'utf8');
            return JSON.parse(data);
          }
        } else {
          // Browser fallback
          try {
            const response = await fetch(`/Server/users/${username}/accessToModules.json`);
            if (response.ok) {
              return await response.json();
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn(`getUserAccessData error for user ${username}:`, e);
      }
      
      // Default to empty object if we can't read the file
      return {};
    };

    // Function to save user access data to accessToModules.json
    const saveUserAccessData = async (username, accessData) => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const accessPath = path.join(process.cwd(), 'Server', 'users', username, 'accessToModules.json');
          
          // Write to file
          fs.writeFileSync(accessPath, JSON.stringify(accessData, null, 2), 'utf8');
          return true;
        } else {
          // Browser fallback - in a real implementation, this would use a backend API
          console.warn('Saving user access data in browser environment not implemented');
          return false;
        }
      } catch (e) {
        console.error(`saveUserAccessData error for user ${username}:`, e);
        return false;
      }
    };

    // Function to read module states from index.json
    const getModuleStates = async () => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const indexPath = path.join(process.cwd(), 'src/renderer/js/modules/index.json');
          
          if (fs.existsSync(indexPath)) {
            const data = fs.readFileSync(indexPath, 'utf8');
            const index = JSON.parse(data);
            const states = {};
            
            if (index.modules && typeof index.modules === 'object') {
              for (const [moduleName, moduleConfig] of Object.entries(index.modules)) {
                states[moduleName] = moduleConfig.enable !== false; // default to true if not specified
              }
            }
            
            return states;
          }
        } else {
          // Browser fallback
          try {
            const response = await fetch('/src/renderer/js/modules/index.json');
            if (response.ok) {
              const index = await response.json();
              const states = {};
              
              if (index.modules && typeof index.modules === 'object') {
                for (const [moduleName, moduleConfig] of Object.entries(index.modules)) {
                  states[moduleName] = moduleConfig.enable !== false;
                }
              }
              
              return states;
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('getModuleStates error:', e);
      }
      
      // Default to all modules enabled if we can't read the file
      return {};
    };

    // Function to save module states to index.json
    const saveModuleStates = async (states) => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const indexPath = path.join(process.cwd(), 'src/renderer/js/modules/index.json');
          
          if (fs.existsSync(indexPath)) {
            const data = fs.readFileSync(indexPath, 'utf8');
            const index = JSON.parse(data);
            
            // Update enable states
            if (index.modules && typeof index.modules === 'object') {
              for (const [moduleName, enableState] of Object.entries(states)) {
                if (index.modules[moduleName]) {
                  index.modules[moduleName].enable = enableState;
                }
              }
            }
            
            // Write back to file
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
            return true;
          }
        } else {
          // Browser fallback - in a real implementation, this would use a backend API
          console.warn('Saving module states in browser environment not implemented');
          return false;
        }
      } catch (e) {
        console.error('saveModuleStates error:', e);
        return false;
      }
    };

    // слушатели
    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener && closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', () => {
      // Clear temporary instructions when canceling
      tempInstructions = {};
      closeModal();
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal(); });

    // Add event listener for the Apply button
    const applyBtn = document.getElementById('apply');
    applyBtn?.addEventListener('click', async () => {
      // Get currently selected user
      const selectedUserRow = usersScroll().querySelector('.user-row.selected-user');
      const selectedUsername = selectedUserRow ? selectedUserRow.getAttribute('data-username') : null;
      
      if (!selectedUsername) {
        console.warn('No user selected');
        return;
      }
      
      // Collect enable states from toggle switches
      const moduleRows = modulesScroll().querySelectorAll('.module-row');
      const moduleStates = {};
      const userAccessData = {};
      
      moduleRows.forEach(row => {
        const moduleNameElement = row.querySelector('span.truncate');
        const enableToggle = row.querySelector('input.toggle-enable');
        const visibleToggle = row.querySelector('input.toggle-visible');
        const lockToggle = row.querySelector('input.toggle-lock');
        
        if (moduleNameElement && enableToggle && visibleToggle && lockToggle) {
          const moduleName = moduleNameElement.textContent;
          const enableState = enableToggle.checked;
          const visibleState = visibleToggle.checked;
          const lockState = lockToggle.checked;
          
          moduleStates[moduleName] = enableState;
          userAccessData[moduleName] = {
            visible: visibleState,
            lock: lockState
          };
        }
      });
      
      // Apply temporary instructions to all users
      const usersToUpdate = new Set([selectedUsername]); // Start with selected user
      
      // Add all users with temp instructions
      for (const username in tempInstructions) {
        usersToUpdate.add(username);
      }
      
      // Save changes for all affected users
      let allSuccess = true;
      
      // Save module states to index.json
      const moduleSuccess = await saveModuleStates(moduleStates);
      if (!moduleSuccess) {
        allSuccess = false;
      }
      
      // Save access data for each affected user
      for (const username of usersToUpdate) {
        // Get the user's current access data
        let userData = allUsersAccessData[username] || {};
        
        // Apply temp instructions for this user
        if (tempInstructions[username]) {
          for (const moduleName in tempInstructions[username]) {
            if (!userData[moduleName]) {
              userData[moduleName] = { visible: true, lock: false };
            }
            
            const instructions = tempInstructions[username][moduleName];
            if (instructions.hasOwnProperty('visible')) {
              userData[moduleName].visible = instructions.visible;
            }
            if (instructions.hasOwnProperty('lock')) {
              userData[moduleName].lock = instructions.lock;
            }
          }
        }
        
        // Save to file
        const accessSuccess = await saveUserAccessData(username, userData);
        if (!accessSuccess) {
          allSuccess = false;
        }
      }
      
      if (allSuccess) {
        // Clear temporary instructions after successful save
        tempInstructions = {};
        
        // Close modal after successful save
        closeModal();
        
        // Show success notification
        if (window.notificationManager) {
          window.notificationManager.createNotification({
            title: 'Настройки модулей',
            message: 'Настройки модулей успешно сохранены',
            type: 'success'
          });
        }
        
        // Reload modules to apply changes
        if (typeof window.loadModules === 'function') {
          window.loadModules({ dev: true });
        }
      } else {
        // Show error notification
        if (window.notificationManager) {
          window.notificationManager.createNotification({
            title: 'Ошибка',
            message: 'Ошибка сохранения настроек модулей',
            type: 'error'
          });
        }
      }
    });

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
