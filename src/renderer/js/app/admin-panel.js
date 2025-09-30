// Панель администратора
// Содержит методы для управления пользователями в панели администратора

import { generateAvatarHTML } from '../utils/avatarUtils.js';

/**
 * Открытие модального окна панели администратора
 * @param {Object} app Экземпляр приложения
 */
export async function openAdminPanelModal(app) {
    const res = await window.UserStore.listUsers();
    const cfg = window.UI_CONFIG;
    const t = cfg?.texts?.user_management?.admin || {};
    if (!res?.ok) { app.showMessage(t.messages?.get_users_error || 'Не удалось получить список пользователей', 'error'); return; }
    const users = res.users || [];
    
    // Сгенерируйте HTML-аватар для всех пользователей
    const usersWithAvatars = await Promise.all(users.map(async u => {
      const avatarHtml = await generateAvatarHTML(u, { size: 'sm', checkFileExists: false });
      return { ...u, avatarHtml };
    }));
    
    const html = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">${t.title || 'Администрирование пользователей'}</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <div class="flex justify-end gap-2">
        <button id="delete-users-toggle" class="h-9 px-3 rounded-lg border border-rose-400/20 hover:bg-rose-500/10 text-sm">${t.buttons?.delete_users || 'Удалить пользователей'}</button>
        <button id="create-user-btn" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.create_user || 'Создать пользователя'}</button>
      </div>
      <div id="users-list" class="rounded-lg border border-white/10 divide-y divide-white/5">
        ${usersWithAvatars.map(u => `
          <div class="user-row flex items-center justify-between p-3" data-username="${u.username}">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-lg overflow-hidden border border-white/10 grid place-items-center">${u.avatarHtml}</div>
              <div>
                <div class="text-sm font-medium">${u.displayName}</div>
                <div class="text-xs text-white/60">${u.username} • ${u.role}</div>
              </div>
            </div>
            <div>
              <button data-username="${u.username}" class="edit-user-btn h-8 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-xs">${t.buttons?.edit || 'Редактировать'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
    app.showModal(html);
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            const data = await window.UserStore.getUser(username);
            if (data?.ok) app.openEditUserModal(data.user); else app.showMessage(t.messages?.user_not_found || 'Пользователь не найден', 'error');
        });
    });
    document.getElementById('create-user-btn').addEventListener('click', () => app.openCreateUserModal());

    // Delete mode controls
    const usersListEl = document.getElementById('users-list');
    const toggleBtn = document.getElementById('delete-users-toggle');
    let deleteMode = false;
    const toDelete = new Set();

    const rebindEditHandlers = () => {
      usersListEl.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const username = e.currentTarget.getAttribute('data-username');
          const data = await window.UserStore.getUser(username);
          if (data?.ok) app.openEditUserModal(data.user); else app.showMessage(t.messages?.user_not_found || 'Пользователь не найден', 'error');
        });
      });
    };

    const enterDeleteMode = () => {
      deleteMode = true;
      toDelete.clear();
      usersListEl.querySelectorAll('.user-row').forEach(row => {
        row.classList.add('ring-1','ring-rose-400/20','bg-rose-500/5');
        const username = row.getAttribute('data-username');
        const btn = row.querySelector('.edit-user-btn, .delete-user-btn');
        if (btn) {
              // Очистим прежние обработчики, создадим новый узел кнопки (clone)
              const newBtn = btn.cloneNode(true);
              btn.replaceWith(newBtn);
              newBtn.textContent = t.buttons?.delete || 'Удалить';
              newBtn.classList.remove('edit-user-btn');
              newBtn.classList.add('delete-user-btn','border-rose-400/30');
              newBtn.setAttribute('data-username', username);
              newBtn.addEventListener('click', () => {
                if (toDelete.has(username)) return; // уже помечен
                toDelete.add(username);
                row.classList.add('bg-rose-500/20');
                // Плавное скрытие строки
                const rect = row.getBoundingClientRect();
                row.style.height = rect.height + 'px';
                row.style.overflow = 'hidden';
                row.style.transition = 'height 220ms ease, opacity 220ms ease, transform 220ms ease';
                row.style.willChange = 'height, opacity, transform';
                // force reflow
                void row.offsetHeight;
                row.style.height = '0px';
                row.style.opacity = '0';
                row.style.transform = 'scale(0.98)';
                const onEnd = () => {
                  row.classList.add('hidden');
                  row.removeEventListener('transitionend', onEnd);
                };
                row.addEventListener('transitionend', onEnd);
              });
            }
          });
          toggleBtn.textContent = t.buttons?.accept_changes || 'Принять изменения';
          toggleBtn.classList.remove('border-rose-400/20','hover:bg-rose-500/10');
          toggleBtn.classList.add('border-emerald-400/30','hover:bg-emerald-500/10');
          // add cancel button
          if (!document.getElementById('cancel-delete-users')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-delete-users';
            cancelBtn.className = 'h-9 px-3 rounded-lg border border-emerald-400/40 hover:bg-emerald-500/10 text-sm text-emerald-200';
            cancelBtn.textContent = t.buttons?.cancel || 'Отменить';
            toggleBtn.parentElement.insertBefore(cancelBtn, toggleBtn);
            cancelBtn.addEventListener('click', exitDeleteMode);
          }
        };

        const exitDeleteMode = () => {
          deleteMode = false;
          toDelete.clear();
          usersListEl.querySelectorAll('.user-row').forEach(row => {
            row.classList.remove('ring-1','ring-rose-400/20','bg-rose-500/5','bg-rose-500/20');
            if (row.classList.contains('hidden')) {
              row.classList.remove('hidden');
              // Плавное восстановление
              row.style.transition = 'height 220ms ease, opacity 220ms ease, transform 220ms ease';
              row.style.willChange = 'height, opacity, transform';
              row.style.height = '0px';
              row.style.opacity = '0';
              row.style.transform = 'scale(0.98)';
              // force reflow
              void row.offsetHeight;
              row.style.height = '';
              row.style.opacity = '';
              row.style.transform = '';
              setTimeout(() => {
                row.style.transition = '';
                row.style.willChange = '';
                row.style.height = '';
                row.style.overflow = '';
              }, 210);
            }
            const btn = row.querySelector('.delete-user-btn, .edit-user-btn');
            if (btn) {
              // Пересоздаем кнопку, чтобы очистить обработчики
              const newBtn = btn.cloneNode(true);
              btn.replaceWith(newBtn);
              newBtn.textContent = t.buttons?.edit || 'Редактировать';
              newBtn.classList.remove('delete-user-btn','border-rose-400/30');
              newBtn.classList.add('edit-user-btn');
            }
          });
          toggleBtn.textContent = t.buttons?.delete_users || 'Удалить пользователей';
          toggleBtn.classList.remove('border-emerald-400/30','hover:bg-emerald-500/10');
          toggleBtn.classList.add('border-rose-400/20','hover:bg-rose-500/10');
          const cancelBtn = document.getElementById('cancel-delete-users');
          if (cancelBtn) cancelBtn.remove();
          rebindEditHandlers();
        };

        toggleBtn.addEventListener('click', async () => {
          if (!deleteMode) {
            enterDeleteMode();
          } else {
            if (toDelete.size === 0) { exitDeleteMode(); return; }
            // Модальное подтверждение удаления
            const confirmHtml = `
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-lg font-semibold">${t.confirm_delete?.title || 'Подтверждение удаления'}</div>
                  <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
                </div>
                <div class="text-sm text-white/80">${(t.confirm_delete?.message || 'Вы уверены, что хотите удалить выбранных пользователей ({count})? Это действие необратимо.').replace('{count}', toDelete.size)}</div>
                <div class="flex justify-end gap-2">
                  <button id="delete-cancel" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${t.confirm_delete?.buttons?.cancel || 'Отмена'}</button>
                  <button id="delete-confirm" class="h-9 px-3 rounded-lg border border-rose-400/30 hover:bg-rose-500/10 text-sm text-rose-200">${t.confirm_delete?.buttons?.confirm || 'Да, удалить'}</button>
                </div>
              </div>`;
            app.showModal(confirmHtml);
            const onCancel = () => { app.closeModal(); };
            const onConfirm = async () => {
              let allOk = true;
              for (const username of Array.from(toDelete)) {
                try { const r = await window.UserStore.deleteUser(username); if (!r?.ok) allOk = false; } catch { allOk = false; }
              }
              app.closeModal();
              if (allOk) app.showMessage(t.messages?.users_deleted || 'Пользователи удалены', 'success'); else app.showMessage(t.messages?.partial_delete_error || 'Часть пользователей удалить не удалось', 'error');
              app.openAdminPanelModal();
            };
            document.getElementById('delete-cancel').addEventListener('click', onCancel);
            document.getElementById('delete-confirm').addEventListener('click', onConfirm);
          }
        });

        // Initial binding for edit buttons already set above
    }