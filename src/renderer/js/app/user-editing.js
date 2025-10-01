// Редактирование пользователей
// Содержит методы для редактирования и создания пользователей

/**
 * Открытие модального окна редактирования пользователя
 * @param {Object} app Экземпляр приложения
 * @param {Object} user Пользователь для редактирования
 */
export function openEditUserModal(app, user) {
    // Load roles dynamically from access configuration
    const loadRoles = async () => {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('access:loadConfig');
            if (result && result.ok && result.config && Array.isArray(result.config.roles)) {
                return result.config.roles;
            }
        } catch (error) {
            console.error('[UserEditing] Error loading roles:', error);
        }
        // Fallback to default roles if loading fails
        return ['User', 'Admin', 'SuperAdmin'];
    };

    // Generate role options HTML
    const generateRoleOptions = (roles, userRole) => {
        return roles.map(role => {
            // Handle special case for SuperAdmin role which might have different names
            const isSelected = (role === 'SuperAdmin' && (userRole === 'SuperAdmin' || userRole === 'СуперАдминистратор')) || 
                             (role !== 'SuperAdmin' && userRole === role);
            return `<option ${isSelected ? 'selected' : ''}>${role}</option>`;
        }).join('');
    };

    // Create the modal HTML with dynamic roles
    const createModalHTML = async () => {
        const roles = await loadRoles();
        return `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">Редактирование пользователя</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <form id="edit-user-form" class="space-y-3">
        <div>
          <div class="text-xs text-white/60 mb-1">Логин (username)</div>
          <input id="eu-username" value="${user.username}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" readonly>
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
          <input id="eu-display" value="${user.displayName || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Роль</div>
          <select id="eu-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
            ${generateRoleOptions(roles, user.role)}
          </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-white/60 mb-1">E‑mail</div>
            <input id="eu-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Телефон</div>
            <input id="eu-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Отдел</div>
            <input id="eu-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Должность</div>
            <input id="eu-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" id="edit-user-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
          <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Сохранить</button>
        </div>
      </form>
    </div>`;
    };

    // Show the modal
    createModalHTML().then(html => {
        app.showModal(html);
        document.getElementById('edit-user-cancel').addEventListener('click', () => { app.openAdminPanelModal(); });
        // Загрузим текущие данные пользователя и заполним поля
        (async () => {
            try {
                const userRes = await window.UserStore.getUser(user.username);
                const userInfo = userRes?.ok ? (userRes.user || {}) : {};
                const emailEl = document.getElementById('eu-email'); if (emailEl) emailEl.value = userInfo.email || '';
                const phoneEl = document.getElementById('eu-phone'); if (phoneEl) phoneEl.value = userInfo.phone || '';
                const depEl = document.getElementById('eu-department'); if (depEl) depEl.value = userInfo.department || '';
                const posEl = document.getElementById('eu-position'); if (posEl) posEl.value = userInfo.position || '';
            } catch (_) {}
        })();
        document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('eu-username').value;
            const displayName = document.getElementById('eu-display').value;
            const role = document.getElementById('eu-role').value;
            const email = document.getElementById('eu-email').value.trim();
            const phone = document.getElementById('eu-phone').value.trim();
            const department = document.getElementById('eu-department').value.trim();
            const position = document.getElementById('eu-position').value.trim();
            const res = await window.UserStore.saveUser(username, { displayName, role });
            const infoSave = await window.UserStore.saveUser(username, { email, phone, department, position });
            if (res?.ok) {
                const current = window.UserStore.getCurrentUser();
                if (current && current.username === username) {
                    // обновим сессию
                    window.UserStore.setCurrentUser({ ...current, displayName, role });
                    app.updateUserInterface().catch(console.warn);
                }
                if (infoSave?.ok) app.showMessage('Сохранено', 'success'); else app.showMessage('Данные сохранены, но данные пользователя не обновлены', 'error');
                app.openAdminPanelModal();
            } else {
                app.showMessage('Не удалось сохранить', 'error');
            }
        });
    });
}

/**
 * Открытие модального окна запроса изменений
 * @param {Object} app Экземпляр приложения
 */
export function openRequestChangesModal(app) {
    const currentUser = window.UserStore?.getCurrentUser();
    
    // Load roles dynamically from access configuration
    const loadRoles = async () => {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('access:loadConfig');
            if (result && result.ok && result.config && Array.isArray(result.config.roles)) {
                return result.config.roles;
            }
        } catch (error) {
            console.error('[UserEditing] Error loading roles:', error);
        }
        // Fallback to default roles if loading fails
        return ['User', 'Admin', 'SuperAdmin'];
    };

    // Generate role options HTML
    const generateRoleOptions = (roles, userRole) => {
        return roles.map(role => {
            // Handle special case for SuperAdmin role which might have different names
            const isSelected = (role === 'SuperAdmin' && (userRole === 'SuperAdmin' || userRole === 'СуперАдминистратор')) || 
                             (role !== 'SuperAdmin' && userRole === role);
            return `<option ${isSelected ? 'selected' : ''}>${role}</option>`;
        }).join('');
    };

    // Create the modal HTML with dynamic roles
    const createModalHTML = async () => {
        const roles = await loadRoles();
        return `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">Запрос изменения данных</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <form id="request-changes-form" class="space-y-3">
        <div>
          <div class="text-xs text-white/60 mb-1">Логин (username)</div>
          <input id="rc-username" value="${currentUser?.username || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" readonly>
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
          <input id="rc-display" value="${currentUser?.displayName || ''}" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Роль</div>
          <select id="rc-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
            ${generateRoleOptions(roles, currentUser?.role)}
          </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-white/60 mb-1">E‑mail</div>
            <input id="rc-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Телефон</div>
            <input id="rc-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Отдел</div>
            <input id="rc-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Должность</div>
            <input id="rc-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" id="request-changes-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
          <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Отправить</button>
        </div>
      </form>
    </div>`;
    };

    // Show the modal
    createModalHTML().then(html => {
        app.showModal(html);
        
        // Загружаем текущие данные пользователя
        if (currentUser?.username) {
            window.UserStore.getUser(currentUser.username).then(userRes => {
                if (userRes?.ok && userRes.user) {
                    const userInfo = userRes.user;
                    const emailEl = document.getElementById('rc-email');
                    const phoneEl = document.getElementById('rc-phone');
                    const depEl = document.getElementById('rc-department');
                    const posEl = document.getElementById('rc-position');
                    
                    if (emailEl) emailEl.value = userInfo.email || '';
                    if (phoneEl) phoneEl.value = userInfo.phone || '';
                    if (depEl) depEl.value = userInfo.department || '';
                    if (posEl) posEl.value = userInfo.position || '';
                }
            });
        }
        
        const cancelRequest = document.getElementById('request-changes-cancel');
        if (cancelRequest) cancelRequest.addEventListener('click', () => { app.closeModal(); });
        
        document.getElementById('request-changes-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            // TODO: Здесь будет логика отправки запроса на изменение данных
            app.showMessage('Запрос отправлен', 'success');
            app.closeModal();
        });
    });
}

/**
 * Открытие модального окна создания пользователя
 * @param {Object} app Экземпляр приложения
 */
export function openCreateUserModal(app) {
    // Load roles dynamically from access configuration
    const loadRoles = async () => {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('access:loadConfig');
            if (result && result.ok && result.config && Array.isArray(result.config.roles)) {
                return result.config.roles;
            }
        } catch (error) {
            console.error('[UserEditing] Error loading roles:', error);
        }
        // Fallback to default roles if loading fails
        return ['User', 'Admin', 'SuperAdmin'];
    };

    // Generate role options HTML
    const generateRoleOptions = (roles) => {
        return roles.map(role => {
            // User is selected by default for new users
            const isSelected = role === 'User';
            return `<option ${isSelected ? 'selected' : ''}>${role}</option>`;
        }).join('');
    };

    // Create the modal HTML with dynamic roles
    const createModalHTML = async () => {
        const roles = await loadRoles();
        return `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">Создание пользователя</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <form id="create-user-form" class="space-y-3">
        <div>
          <div class="text-xs text-white/60 mb-1">Логин (username)</div>
          <input id="cu-username" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="username">
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Пароль</div>
          <input id="cu-password" type="password" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="••••••••">
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Отображаемое имя</div>
          <input id="cu-display" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Имя">
        </div>
        <div>
          <div class="text-xs text-white/60 mb-1">Роль</div>
          <select id="cu-role" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2">
            ${generateRoleOptions(roles)}
          </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-white/60 mb-1">E‑mail</div>
            <input id="cu-email" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="user@example.com">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Телефон</div>
            <input id="cu-phone" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="+7...">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Отдел</div>
            <input id="cu-department" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Отдел">
          </div>
          <div>
            <div class="text-xs text-white/60 mb-1">Должность</div>
            <input id="cu-position" class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-2" placeholder="Должность">
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" id="create-user-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Отмена</button>
          <button type="submit" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">Создать</button>
        </div>
      </form>
    </div>`;
    };

    // Show the modal
    createModalHTML().then(html => {
        app.showModal(html);
        const cancelCreate = document.getElementById('create-user-cancel');
        if (cancelCreate) cancelCreate.addEventListener('click', () => { app.openAdminPanelModal(); });
        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('cu-username').value.trim();
            const password = document.getElementById('cu-password').value;
            const displayName = document.getElementById('cu-display').value.trim();
            const role = document.getElementById('cu-role').value;
            const email = document.getElementById('cu-email').value.trim();
            const phone = document.getElementById('cu-phone').value.trim();
            const department = document.getElementById('cu-department').value.trim();
            const position = document.getElementById('cu-position').value.trim();
            const res = await window.UserStore.createUser({ username, password, displayName, role, email, phone, department, position });
            if (res?.ok) {
                app.showMessage('Пользователь создан', 'success');
                app.openAdminPanelModal();
            } else {
                app.showMessage('Не удалось создать пользователя', 'error');
            }
        });
    });
}
