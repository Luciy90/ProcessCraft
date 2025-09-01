class ProfileModule {
  init() {
    this.render();
  }

  render() {
    const container = document.getElementById('profile-module');
    if (!container) return;

    const user = window.UserStore?.getCurrentUser();
    const displayName = user?.displayName || user?.username || 'Пользователь';
    const role = user?.role || 'User';
    const lastLogin = user?.lastLoginAt || '—';

    // Загружаем HTML шаблон и подставляем данные
    const templatePath = 'templates/profile.html';
    Promise.all([
      fetch(templatePath).then(r => r.text()),
      user?.username ? window.UserStore.getSection(user.username, 'visits') : Promise.resolve({ ok: true, data: { total: 0, last: null, history: [] } }),
      user?.username ? window.UserStore.getSection(user.username, 'tasks') : Promise.resolve({ ok: true, data: { current: [], backlog: [] } }),
      user?.username ? window.UserStore.getSection(user.username, 'activity') : Promise.resolve({ ok: true, data: { items: [] } }),
      user?.username ? window.UserStore.getSection(user.username, 'info') : Promise.resolve({ ok: true, data: { phone: '', email: '', department: '', position: '' } })
    ]).then(async ([html, visitsRes, tasksRes, activityRes, infoRes]) => {
        // Generate avatar using centralized logic
        const avatar = await window.AvatarUtils.generateAvatarHTML(user, { size: 'lg' });
        const isSuper = (role === 'SuperAdmin' || role === 'СуперАдминистратор');
        const adminActions = `
          <div class="flex items-center gap-2">
            <button id="profile-logout" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Выйти</button>
            ${isSuper ? 
              `<button id="profile-admin-list" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Администрирование</button>` : 
              `<button id="profile-request-changes" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Запросить изменение данных</button>`
            }
          </div>`;

        // Determine cover image source
        const coverImageSrc = user?.coverPath ? `file://${user.coverPath}` : 'file://' + require('path').join(__dirname, '../../assets/cover.jpg').replace(/\\/g, '/');

        let out = html
          .replace(/\{\{AVATAR_HTML\}\}/g, avatar)
          .replace(/\{\{DISPLAY_NAME\}\}/g, displayName)
          .replace(/\{\{USERNAME\}\}/g, user?.username || '')
          .replace(/\{\{ROLE\}\}/g, role)
          .replace(/\{\{LAST_LOGIN\}\}/g, lastLogin)
          .replace(/\{\{ADMIN_ACTIONS_CARD\}\}/g, adminActions)
          .replace(/\{\{COVER_IMAGE_SRC\}\}/g, coverImageSrc);

        // Process UI_CONFIG placeholders
        out = this.processUIConfigPlaceholders(out);

        container.innerHTML = out;
        
        // Ensure Lucide icons render after dynamic injection
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try {
              // Recreate icons specifically for the profile container
              window.lucide.createIcons({ 
                attrs: { 'stroke-width': 1.5 },
                container: container 
              });
              console.log('Lucide icons recreated for profile module');
            } catch (e) { 
              console.warn('Lucide render warn:', e); 
            }
          } else {
            console.error('Lucide not available for profile icons');
          }
        }, 10);

        // Заполним info
        const info = infoRes?.ok ? (infoRes.data || {}) : {};
        const emailEl = document.getElementById('info-email'); if (emailEl) emailEl.textContent = info.email || '—';
        const phoneEl = document.getElementById('info-phone'); if (phoneEl) phoneEl.textContent = info.phone || '—';
        const depEl = document.getElementById('info-department'); if (depEl) depEl.textContent = info.department || '—';
        const posEl = document.getElementById('info-position'); if (posEl) posEl.textContent = info.position || '—';

        // Посещения
        const visits = visitsRes?.ok ? (visitsRes.data || { total: 0, last: null, history: [] }) : { total: 0, last: null, history: [] };
        const totalEl = document.getElementById('visits-total'); if (totalEl) totalEl.textContent = visits.total ?? 0;
        const lastEl = document.getElementById('visits-last'); if (lastEl) lastEl.textContent = visits.last ? new Date(visits.last).toLocaleString() : '—';
        const vh = document.getElementById('visits-history');
        if (vh) vh.innerHTML = (visits.history || []).map(v => `
          <div class="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/80 flex items-center justify-between">
            <div>${v.note || 'Вход в систему'}</div>
            <div class="text-white/50 text-xs">${new Date(v.time).toLocaleString()}</div>
          </div>`).join('');

        // Задачи
        const tasks = tasksRes?.ok ? (tasksRes.data || { current: [], backlog: [] }) : { current: [], backlog: [] };
        const tc = document.getElementById('tasks-current');
        if (tc) tc.innerHTML = (tasks.current || []).map(t => `
          <div class="rounded border border-white/10 bg-white/[0.02] p-2 text-sm flex items-center justify-between"><div>${t.title}</div><div class="text-xs text-white/50">${t.due ? new Date(t.due).toLocaleDateString() : ''}</div></div>`).join('');
        const tb = document.getElementById('tasks-backlog');
        if (tb) tb.innerHTML = (tasks.backlog || []).map(t => `
          <div class="rounded border border-white/10 bg-white/[0.02] p-2 text-sm flex items-center justify-between"><div>${t.title}</div><div class="text-xs text-white/50">${t.due ? new Date(t.due).toLocaleDateString() : ''}</div></div>`).join('');

        // Активность
        const activityWrap = document.getElementById('profile-activity');
        const activity = activityRes?.ok ? (activityRes.data?.items || []) : [];
        if (activityWrap) {
          activityWrap.innerHTML = activity.map(a => `
            <div class="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/80 flex items-center justify-between">
              <div>${a.text}</div>
              <div class="text-white/50 text-xs">${new Date(a.time).toLocaleString()}</div>
            </div>`).join('');
        }

        if (isSuper) {
          const listBtn = document.getElementById('profile-admin-list');
          if (listBtn) listBtn.addEventListener('click', () => window.app.openAdminPanelModal());
        } else {
          const requestBtn = document.getElementById('profile-request-changes');
          if (requestBtn) requestBtn.addEventListener('click', () => window.app.openRequestChangesModal());
        }
        const logoutBtn = document.getElementById('profile-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', async () => { await window.UserStore.logout(); window.location.reload(); });

        const refreshBtn = document.getElementById('refresh-activity');
        if (refreshBtn && user?.username) {
          refreshBtn.addEventListener('click', async () => {
            const p = await window.UserStore.getSection(user.username, 'activity');
            const wrap = document.getElementById('profile-activity');
            if (wrap && p?.ok) {
              const arr = p.data?.items || [];
              wrap.innerHTML = arr.length ? arr.map(a => `
                <div class=\"rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/80 flex items-center justify-between\">
                  <div>${a.text}</div>
                  <div class=\"text-white/50 text-xs\">${new Date(a.time).toLocaleString()}</div>
                </div>`).join('') : '<div class="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/70">Записей пока нет</div>';
            }
          });
        }

        // Setup file upload handlers
        this.setupFileUploads(user);
        
        // Setup copy email functionality
        this.setupCopyEmail(info);
        
        // Final icon initialization after all dynamic content is loaded
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try {
              window.lucide.createIcons({ 
                attrs: { 'stroke-width': 1.5 },
                container: container 
              });
              console.log('Final Lucide icons initialization for profile completed');
            } catch (e) { 
              console.warn('Final Lucide initialization warn:', e); 
            }
          }
        }, 50);
      })
      .catch(err => {
        console.error('Не удалось загрузить шаблон профиля:', err);
      });
  }

  processUIConfigPlaceholders(html) {
    // Replace UI_CONFIG placeholders with actual values
    const cfg = window.UI_CONFIG;
    if (!cfg) {
      console.warn('UI_CONFIG not available for template processing');
      return html;
    }

    // Replace all UI_CONFIG.texts.profile.* placeholders
    return html.replace(/\{\{UI_CONFIG\.([^}]+)\}\}/g, (match, path) => {
      try {
        const keys = path.split('.');
        let value = cfg;
        for (const key of keys) {
          value = value[key];
          if (value === undefined) {
            console.warn(`UI_CONFIG path not found: ${path}`);
            return match; // Return original placeholder if path not found
          }
        }
        return value;
      } catch (error) {
        console.warn(`Error processing UI_CONFIG placeholder: ${path}`, error);
        return match; // Return original placeholder on error
      }
    });
  }

  setupCopyEmail(info) {
    const copyEmailBtn = document.getElementById('btnCopyEmail');
    if (copyEmailBtn && info?.email) {
      copyEmailBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(info.email);
          window.app.showMessage('Email скопирован в буфер обмена', 'success');
        } catch (err) {
          console.error('Failed to copy email:', err);
          window.app.showMessage('Не удалось скопировать email', 'error');
        }
      });
    }
  }

  setupFileUploads(user) {
    if (!user?.username) {
      console.log('setupFileUploads: no user or username');
      return;
    }

    console.log('setupFileUploads: setting up for user:', user.username);

    // Cover image upload
    const coverInput = document.getElementById('coverInput');
    console.log('coverInput found:', !!coverInput);
    if (coverInput) {
      coverInput.addEventListener('change', async (e) => {
        console.log('coverInput change event triggered');
        const file = e.target.files[0];
        if (!file) {
          console.log('no file selected');
          return;
        }
        console.log('file selected:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'cover', user.username);
          console.log('upload result:', result);
          if (result.status === 'success') {
            // Update cover image
            const coverImage = document.getElementById('coverImage');
            if (coverImage) {
              coverImage.src = `file://${result.file_path}`;
            }
            
            // Update current user in store with cover path
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.coverPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }
            
            window.app.showMessage('Фоновое изображение обновлено', 'success');
          } else {
            window.app.showMessage(`Ошибка: ${result.message}`, 'error');
          }
        } catch (err) {
          console.error('cover upload error:', err);
          window.app.showMessage('Ошибка при загрузке файла', 'error');
        }
      });
    }

    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    console.log('avatarInput found:', !!avatarInput);
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
        console.log('avatarInput change event triggered');
        const file = e.target.files[0];
        if (!file) {
          console.log('no file selected');
          return;
        }
        console.log('file selected:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'avatar', user.username);
          console.log('upload result:', result);
          if (result.status === 'success') {
            // Update avatar in profile - fix size to fill container
            const avatarContainer = document.querySelector('.h-24.w-24, .h-28.w-28');
            if (avatarContainer) {
              avatarContainer.innerHTML = `<img src="file://${result.file_path}" class="h-full w-full object-cover">`;
            }
            
            // Update avatar in top bar
            const topBarAvatar = document.getElementById('user-avatar');
            if (topBarAvatar) {
              topBarAvatar.src = `file://${result.file_path}`;
              topBarAvatar.classList.remove('hidden');
            }
            const fallback = document.getElementById('user-avatar-fallback');
            if (fallback) fallback.classList.add('hidden');

            // Update current user in store
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.avatarPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }

            // Re-render user avatar in top bar to ensure consistency
            if (window.app && typeof window.app.updateUserInterface === 'function') {
              window.app.updateUserInterface();
            }

            window.app.showMessage('Аватар обновлен', 'success');
          } else {
            window.app.showMessage(`Ошибка: ${result.message}`, 'error');
          }
        } catch (err) {
          console.error('avatar upload error:', err);
          window.app.showMessage('Ошибка при загрузке аватара', 'error');
        }
      });
    }
  }

  async uploadFile(file, type, username) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return {
        status: 'error',
        error_code: 'invalid_file_type',
        message: 'Поддерживаются только файлы JPEG и PNG'
      };
    }

    // Convert file to base64 for transfer
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = {
            type: file.type,
            data: reader.result.split(',')[1], // Remove data:image/...;base64, prefix
            fileName: file.name // Add original filename
          };

          let result;
          if (type === 'cover') {
            result = await window.UserStore.uploadCover(username, fileData);
          } else if (type === 'avatar') {
            result = await window.UserStore.uploadAvatar(username, fileData);
          }

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

window.ProfileModule = ProfileModule;
