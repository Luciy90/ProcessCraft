// Работа с профилем пользователя
// Содержит методы для отображения и управления профилем пользователя

import { updateAvatarInDOM } from '../utils/avatarUtils.js';

/**
 * Открытие модального окна профиля
 * @param {Object} app Экземпляр приложения
 * @param {Object} user Пользователь (опционально)
 */
export function openProfileModal(app, user) {
    const u = user || window.UserStore?.getCurrentUser();
    console.log('[UserProfile] User data in modal:', u); // Debug log
    
    if (!u) { app.openLoginModal(); return; }
    const cfg = window.UI_CONFIG;
    const t = cfg?.texts?.user_management?.profile || {};
    const html = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">${t.title || 'Личный кабинет'}</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <div class="flex items-center gap-3">
        <div class="h-16 w-16 rounded-lg overflow-hidden border border-white/10 grid place-items-center" id="profile-modal-avatar">
          <!-- Avatar will be populated by JavaScript -->
        </div>
        <div>
          <div class="text-base font-medium">${u.displayName || u.username}</div>
          <div class="text-xs text-white/60">${t.role_label || 'Роль:'} ${u.role || 'User'}</div>
        </div>
      </div>
      <div class="flex gap-2 pt-1">
        <button id="logout-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${t.buttons?.logout || 'Выйти'}</button>
        <button id="admin-panel-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.admin_panel || 'Администрирование'}</button>
      </div>
    </div>`;
    app.showModal(html);
    
    // Populate avatar in modal using module function
    updateAvatarInDOM('#profile-modal-avatar', u, { size: 'md' });
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await window.UserStore.logout();
        app.updateUserInterface().catch(console.warn);
        app.closeModal();
    });
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            if (app && typeof app.openAdminPanelModal === 'function') {
                app.openAdminPanelModal();
            }
        });
    }
}

/**
 * Открытие страницы профиля
 * @param {Object} app Экземпляр приложения
 */
export function openProfilePage(app) {
    // Переключаемся на модуль profile и рендерим его
    // Гарантируем наличие модуля
    if (!app.modules.profile) {
        app.modules.profile = new ProfileModule();
    }
    // Обеспечим, что контейнер существует
    const el = document.getElementById('profile-module');
    if (!el) {
        console.error('Нет контейнера profile-module');
        return;
    }
    app.switchModule('profile').catch(error => console.error('Ошибка переключения на профиль:', error));
    // Всегда повторно инициализируйте профиль, чтобы получить свежие данные (включая изображения обложек).
    app.modules.profile.init();
    const currentModuleEl = document.getElementById('current-module');
    if (currentModuleEl) currentModuleEl.textContent = window.UI_CONFIG?.texts?.user_management?.profile?.user_profile_title || 'Профиль пользователя';
}