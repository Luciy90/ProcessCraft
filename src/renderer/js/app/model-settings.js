
// Извлечено из src/renderer/templates/model-settings.html
// Обеспечивает инициализацию модального окна настроек (списки пользователей / модулей)
import { generateAvatarHTML } from '../utils/avatarUtils.js';

export function initModelSettings() {
  try {
    const overlay       = document.getElementById('settingsModal');
    if (!overlay) return; // ничего не делать, если шаблон отсутствует
    // ничего не делать, если шаблон отсутствует
    const openBtn       = document.getElementById('sidebar-settings');
    const closeBtn      = document.getElementById('closeModal'); // может отсутствовать
    const cancelBtn     = document.getElementById('cancel');
    const usersScroll   = () => overlay.querySelector('.model-settings-users-list-scroll');
    const modulesScroll = () => overlay.querySelector('.model-settings-modules-list-scroll');

    // Временное хранение инструкций
    let tempInstructions = {};
    
    // Текущий выбранный пользователь
    let selectedUser = null;
    
    // Данные доступа всех пользователей
    let allUsersAccessData = {};

    // Чтение пользователей из локальной директории Server/users (Electron) или через fetch fallback (браузер).
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
            // пропустить очевидные временные/шаблонные папки
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

            // Включаем avatarPath в данные пользователя
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
          // Резервный вариант для браузера - попытка получить индекс или каждую папку (наилучшие усилия)
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
      // Очистка временных инструкций при закрытии модального окна
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

    // Обновить функцию moduleToggleGroup для принятия состояния видимости
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

      // пользователи — рендерим асинхронно используя централизованные утилиты аватаров
      // пользователи
      const userNodes = await Promise.all(users.map(async u => {
        // генерировать HTML аватара (внутренне использует проверки UserStore)
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

      // Чтение состояний включения модулей из index.json
      const moduleStates = await getModuleStates();

      // Получение имен модулей из index.json для обеспечения правильного сопоставления
      const indexModuleNames = Object.keys(moduleStates);

      // Загрузка данных доступа для всех пользователей
      allUsersAccessData = {};
      for (const user of users) {
        allUsersAccessData[user.username] = await getUserAccessData(user.username);
      }

      // Выбор первого пользователя по умолчанию
      if (users.length > 0) {
        selectedUser = users[0].username;
      }

      // Получение данных доступа текущего пользователя (с примененными временными инструкциями)
      const currentUserAccess = getCurrentUserAccessData(selectedUser, indexModuleNames);
      
      // Получение состояний модулей с примененными временными инструкциями
      const moduleStatesWithTemp = getModuleStatesWithTempInstructions(selectedUser, moduleStates);

      // модули: заблокируем несколько (оранжевый замок) — если модулей нет, оставим список пустым
      modulesScroll().innerHTML = indexModuleNames.map((moduleName) => {
        // Получение состояния включения для этого модуля
        const isEnabled = moduleStatesWithTemp[moduleName] !== undefined ? moduleStatesWithTemp[moduleName] : true;
        
        // Получение данных доступа для этого модуля для выбранного пользователя
        const moduleAccess = currentUserAccess[moduleName] || { visible: true, lock: false };
        
        return moduleToggleGroup(moduleName, moduleAccess.lock, isEnabled, moduleAccess.visible);
      }).join('');

      lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });

      // Поведение выбора пользователя
      const userRows = usersScroll().querySelectorAll('.user-row');
      let currentSelected = null;

      userRows.forEach(row => {
        row.addEventListener('click', async () => {
          // Получение имени пользователя из атрибута данных
          const username = row.getAttribute('data-username');
          
          if (!username) return;
          
          if (currentSelected) {
            currentSelected.classList.remove('selected-user');
          }
          row.classList.add('selected-user');
          currentSelected = row;
          userRows.forEach(r => r.setAttribute('aria-selected', r === row ? 'true' : 'false'));
          
          // Переключение на выбранного пользователя
          await switchUser(username, moduleStates, indexModuleNames);
        });
      });

      // Реакция иконки блокировки (оранжевая при блокировке)
      modulesScroll().querySelectorAll('.module-row').forEach(row => {
        const lockToggle = row.querySelector('input.toggle-lock');
        const visibleToggle = row.querySelector('input.toggle-visible');
        const enableToggle = row.querySelector('input.toggle-enable'); // Добавить эту строку
        const moduleNameElement = row.querySelector('span.truncate');
        
        if (!lockToggle || !visibleToggle || !moduleNameElement) return;
        
        const moduleName = moduleNameElement.textContent;

        // Реакция иконки блокировки (оранжевая при блокировке)
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

        // Сохранение временной инструкции при изменении переключателей
        lockToggle.addEventListener('change', () => {
          // Убедиться, что у нас есть выбранный пользователь, по умолчанию первый пользователь, если никто не выбран
          const currentUser = selectedUser || (Object.keys(allUsersAccessData).length > 0 ? Object.keys(allUsersAccessData)[0] : null);
          if (currentUser) {
            applyLockState();
            storeTempInstruction(currentUser, moduleName, 'lock', lockToggle.checked);
          }
        });
        
        visibleToggle.addEventListener('change', () => {
          // Убедиться, что у нас есть выбранный пользователь, по умолчанию первый пользователь, если никто не выбран
          const currentUser = selectedUser || (Object.keys(allUsersAccessData).length > 0 ? Object.keys(allUsersAccessData)[0] : null);
          if (currentUser) {
            storeTempInstruction(currentUser, moduleName, 'visible', visibleToggle.checked);
          }
        });

        // Добавить обработчик события для переключателя включения
        if (enableToggle) {
          enableToggle.addEventListener('change', () => {
            // Для переключателя включения мы сохраняем инструкцию для всех пользователей, так как это глобальная настройка
            // Получить все имена пользователей из allUsersAccessData
            const allUsernames = Object.keys(allUsersAccessData);
            
            // Сохранить инструкцию для всех пользователей
            allUsernames.forEach(username => {
              storeTempInstruction(username, moduleName, 'enable', enableToggle.checked);
            });
            
            // Также обновить глобальный объект moduleStates напрямую
            if (moduleStates && moduleStates.hasOwnProperty(moduleName)) {
              moduleStates[moduleName] = enableToggle.checked;
            }
          });
        }

        // инициализация и прослушивание
        applyLockState();
      });
    };

    // Функция для переключения на другого пользователя
    const switchUser = async (username, moduleStates, moduleNames) => {
      // Сохранение временных инструкций текущего пользователя
      // (They're already stored in tempInstructions)
      
      // Переключиться на нового пользователя
      selectedUser = username;
      
      // Получение данных доступа текущего пользователя (с примененными временными инструкциями)
      const currentUserAccess = getCurrentUserAccessData(selectedUser, moduleNames);
      
      // Получение состояний модулей с примененными временными инструкциями
      const moduleStatesWithTemp = getModuleStatesWithTempInstructions(selectedUser, moduleStates);
      
      // Обновление переключателей модулей с данными доступа нового пользователя с использованием нового обработчика
      updateUserModuleToggles(currentUserAccess, moduleStatesWithTemp, moduleNames);
    };

    // Функция для получения данных доступа текущего пользователя с примененными временными инструкциями
    const getCurrentUserAccessData = (username, moduleNames) => {
      // Начать с реальных данных доступа пользователя
      const userData = allUsersAccessData[username] || {};
      
      // Применить временные инструкции
      const result = {};
      for (const moduleName of moduleNames) {
        result[moduleName] = userData[moduleName] || { visible: true, lock: false };
        
        // Проверить, есть ли временные инструкции для этого пользователя/модуля
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

    // Функция для получения состояний модулей с примененными временными инструкциями
    const getModuleStatesWithTempInstructions = (username, moduleStates) => {
      // Начать с реальных состояний модулей
      const result = { ...moduleStates };
      
      // Применить временные инструкции для свойства включения
      if (tempInstructions[username]) {
        for (const moduleName in tempInstructions[username]) {
          const instructions = tempInstructions[username][moduleName];
          if (instructions.hasOwnProperty('enable')) {
            result[moduleName] = instructions.enable;
          }
        }
      }
      
      return result;
    };

    // Функция для сохранения временной инструкции
    const storeTempInstruction = (username, moduleName, property, value) => {
      if (!tempInstructions[username]) {
        tempInstructions[username] = {};
      }
      if (!tempInstructions[username][moduleName]) {
        tempInstructions[username][moduleName] = {};
      }
      tempInstructions[username][moduleName][property] = value;
    };

    // Новая функция-обработчик для обновления переключателей модулей с анимацией при смене пользователей
    const updateUserModuleToggles = (userAccessData, moduleStates, moduleNames) => {
      // Получить все строки модулей
      const moduleRows = modulesScroll().querySelectorAll('.module-row');
      
      // Обработать каждую строку модуля последовательно
      moduleRows.forEach((row, index) => {
        const moduleNameElement = row.querySelector('span.truncate');
        if (!moduleNameElement) return;
        
        const moduleName = moduleNameElement.textContent;
        
        // Получить элементы переключателей
        const visibleToggle = row.querySelector('input.toggle-visible');
        const lockToggle = row.querySelector('input.toggle-lock');
        const enableToggle = row.querySelector('input.toggle-enable');
        
        if (!visibleToggle || !lockToggle || !enableToggle) return;
        
        // Получить целевые состояния для этого модуля
        const isEnabled = moduleStates[moduleName] !== undefined ? moduleStates[moduleName] : true;
        const moduleAccess = userAccessData[moduleName] || { visible: true, lock: false };
        const targetVisible = moduleAccess.visible;
        const targetLock = moduleAccess.lock;
        const targetEnable = isEnabled;
        
        // Запланировать обновления с задержкой для создания последовательного эффекта
        setTimeout(() => {
          // Обновить переключатель видимости с анимацией
          updateToggleWithAnimation(visibleToggle, targetVisible, 'user-switch-animation');
          
          // Обновить переключатель блокировки с анимацией
          updateToggleWithAnimation(lockToggle, targetLock, 'user-switch-animation-lock');
          
          // Обновить переключатель включения с анимацией
          updateToggleWithAnimation(enableToggle, targetEnable, 'user-switch-animation-enable');
          
          // Обновить значок блокировки
          const lockIcon = row.querySelector('.lock-indicator');
          if (lockIcon) {
            if (targetLock) {
              lockIcon.setAttribute('data-lucide', 'lock');
              lockIcon.classList.remove('text-white/60');
              lockIcon.classList.add('text-orange-400');
            } else {
              lockIcon.setAttribute('data-lucide', 'unlock');
              lockIcon.classList.remove('text-orange-400');
              lockIcon.classList.add('text-white/60');
            }
            lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
          }
        }, index * 50); // 50ms delay between each module for sequential effect
      });
    };

    // Вспомогательная функция для обновления состояния переключателя с анимацией
    const updateToggleWithAnimation = (toggle, targetState, animationClass) => {
      // Продолжить только если состояние нужно изменить
      if (toggle.checked !== targetState) {
        // Добавить класс анимации к родительскому элементу переключателя
        const switchElement = toggle.closest('.model-settings-switch');
        if (switchElement) {
          switchElement.classList.add(animationClass);
          
          // Удалить класс анимации после завершения анимации
          setTimeout(() => {
            switchElement.classList.remove(animationClass);
          }, 400); // Соответствует длительности анимации в CSS
        }
        
        // Обновить состояние переключателя после небольшой задержки, чтобы обеспечить запуск анимации
        setTimeout(() => {
          toggle.checked = targetState;
          
          // Вызвать событие изменения, чтобы обеспечить правильное обновление UI и сохранить временные инструкции
          const event = new Event('change', { bubbles: true });
          toggle.dispatchEvent(event);
        }, 10);
      }
    };

    // Функция для чтения данных доступа пользователя из accessToModules.json
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
          // Резервный вариант для браузера
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
      
      // По умолчанию пустой объект, если мы не можем прочитать файл
      return {};
    };

    // Функция для сохранения данных доступа пользователя в accessToModules.json
    const saveUserAccessData = async (username, accessData) => {
      try {
        const isElectron = typeof window.require !== 'undefined' && typeof process !== 'undefined';
        if (isElectron) {
          const fs = window.require('fs');
          const path = window.require('path');
          const accessPath = path.join(process.cwd(), 'Server', 'users', username, 'accessToModules.json');
          
          // Запись в файл
          fs.writeFileSync(accessPath, JSON.stringify(accessData, null, 2), 'utf8');
          return true;
        } else {
          // Резервный вариант для браузера - в реальной реализации это будет использовать API бэкенда
          console.warn('Saving user access data in browser environment not implemented');
          return false;
        }
      } catch (e) {
        console.error(`saveUserAccessData error for user ${username}:`, e);
        return false;
      }
    };

    // Функция для чтения состояний модулей из index.json
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
                states[moduleName] = moduleConfig.enable !== false; // по умолчанию true, если не указано
              }
            }
            
            return states;
          }
        } else {
          // Резервный вариант для браузера
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
      
      // По умолчанию все модули включены, если мы не можем прочитать файл
      return {};
    };

    // Функция для сохранения состояний модулей в index.json
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
            
            // Обновление состояний включения
            if (index.modules && typeof index.modules === 'object') {
              for (const [moduleName, enableState] of Object.entries(states)) {
                if (index.modules[moduleName]) {
                  index.modules[moduleName].enable = enableState;
                }
              }
            }
            
            // Запись обратно в файл
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
            return true;
          }
        } else {
          // Резервный вариант для браузера - в реальной реализации это будет использовать API бэкенда
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
      // Очистить временные инструкции при отмене
      tempInstructions = {};
      closeModal();
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal(); });

    // Добавить обработчик события для кнопки Применить
    const applyBtn = document.getElementById('apply');
    applyBtn?.addEventListener('click', async () => {
      // Получить текущего выбранного пользователя
      const selectedUserRow = usersScroll().querySelector('.user-row.selected-user');
      let selectedUsername = selectedUserRow ? selectedUserRow.getAttribute('data-username') : null;
      
      // Если пользователь не выбран явно, но у нас есть временные инструкции, использовать первого пользователя с инструкциями
      if (!selectedUsername && Object.keys(tempInstructions).length > 0) {
        selectedUsername = Object.keys(tempInstructions)[0];
      }
      
      // Если все еще не выбран пользователь, использовать первого пользователя из allUsersAccessData
      if (!selectedUsername && Object.keys(allUsersAccessData).length > 0) {
        selectedUsername = Object.keys(allUsersAccessData)[0];
      }
      
      if (!selectedUsername) {
        console.warn('No user selected');
        return;
      }
      
      // Собрать состояния включения с переключателей
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
      
      // Применение временных инструкций ко всем пользователям
      const usersToUpdate = new Set([selectedUsername]); // Начать с выбранного пользователя
      
      // Добавить всех пользователей с временными инструкциями
      for (const username in tempInstructions) {
        usersToUpdate.add(username);
      }
      
      // Сохранить изменения для всех затронутых пользователей
      let allSuccess = true;
      
      // Сохранение состояний модулей в index.json
      const moduleSuccess = await saveModuleStates(moduleStates);
      if (!moduleSuccess) {
        allSuccess = false;
      }
      
      // Сохранение данных доступа для каждого затронутого пользователя
      for (const username of usersToUpdate) {
        // Получение текущих данных доступа пользователя
        let userData = allUsersAccessData[username] || {};
        
        // Применить временные инструкции для этого пользователя
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
            // Обработать свойство включения, если оно существует во временных инструкциях
            if (instructions.hasOwnProperty('enable')) {
              // Для свойства включения нам нужно обновить объект moduleStates
              // которые будут сохранены в index.json
              if (moduleStates.hasOwnProperty(moduleName)) {
                moduleStates[moduleName] = instructions.enable;
              }
            }
          }
        }
        
        // Сохранить в файл
        const accessSuccess = await saveUserAccessData(username, userData);
        if (!accessSuccess) {
          allSuccess = false;
        }
      }
      
      // Также сохранить обновленные состояния модулей в index.json
      const moduleSuccess2 = await saveModuleStates(moduleStates);
      if (!moduleSuccess2) {
        allSuccess = false;
      }
      
      if (allSuccess) {
        // Очистить временные инструкции после успешного сохранения
        tempInstructions = {};
        
        // Закрыть модальное окно после успешного сохранения
        closeModal();
        
        // Показать уведомление об успехе
        if (window.notificationManager) {
          window.notificationManager.createNotification({
            title: 'Настройки модулей',
            message: 'Настройки модулей успешно сохранены',
            type: 'success'
          });
        }
        
        // Перезагрузить модули для применения изменений
        if (typeof window.loadModules === 'function') {
          window.loadModules({ dev: true });
        }
      } else {
        // Показать уведомление об ошибке
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