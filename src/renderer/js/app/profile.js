import { generateAvatarHTML } from '../utils/avatarUtils.js';

class ProfileModule {
  init() {
    this.render().catch(error => {
      console.error('Failed to render profile module:', error);
    });
  }

  async render() {
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
      user?.username ? window.UserStore.getUser(user.username).then(res => ({ ok: res.ok, data: res.user || {} })) : Promise.resolve({ ok: true, data: { phone: '', email: '', department: '', position: '' } })
    ]).then(async ([html, visitsRes, tasksRes, activityRes, infoRes]) => {
  // Generate avatar using centralized logic (module import)
  const avatar = await generateAvatarHTML(user, { size: 'lg' });
        const adminActions = `
          <div class="flex items-center gap-2">
            <button id="profile-logout" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Выйти</button>
            <button id="profile-admin-list" data-access-marker="profile-admin-list-mark" data-access-description="Управление пользователями" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Пользователи</button>
            <button id="profile-access-modal" data-access-marker="profile-access-modal-mark" data-access-down="profile-admin-list-mark" data-access-description="Управление правами доступа" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Права доступа</button>
            <button id="profile-request-changes" data-access-marker="profile-request-changes-mark" data-access-description="Запросить изменение данных" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Запросить изменение данных</button>
          </div>`;

        // Determine cover image source with user-specific fallback
        let coverImageSrc;
        if (user?.coverPath) {
          coverImageSrc = `file://${user.coverPath}`;
        } else {
          // Check for user-specific cover images, fallback to default
          coverImageSrc = await this.getCoverImagePath(user);
        }

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
        // После динамической вставки шаблона применяем правила доступа, чтобы
        // элементы с data-access-marker были скрыты/показаны согласно конфигурации.
        try {
          if (window.app && typeof window.app.applyAccessRules === 'function') {
            window.app.applyAccessRules();
          } else if (typeof window.applyAccessRules === 'function') {
            window.applyAccessRules(window.app);
          }
        } catch (e) {
          console.warn('applyAccessRules after profile render failed:', e);
        }
        
        // Обеспечить отображение иконок Lucide после динамической вставки
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try {
              // Recreate icons specifically for the profile container
              window.lucide.createIcons({ 
                attrs: { 'stroke-width': 1.5 },
                container: container 
              });
              console.log('Иконки Lucide пересозданы для модуля профиля');
            } catch (e) { 
              console.warn('Lucide render warn:', e); 
            }
          } else {
            console.error('Lucide not available for profile icons');
          }
        }, 10);

        // Заполним info
        const info = infoRes?.ok ? (infoRes.user || infoRes.data || {}) : {};
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

        // Always attach handlers to profile buttons. Access control should be enforced
        // centrally via data-access-marker attributes and the app.applyAccessRules mechanism.
        const listBtn = document.getElementById('profile-admin-list');
        if (listBtn) {
          listBtn.addEventListener('click', () => {
            if (window.app && typeof window.app.openAdminPanelModal === 'function') {
              try { window.app.openAdminPanelModal(); } catch (e) { console.warn('openAdminPanelModal failed:', e); }
            }
          });
        }

        const requestBtn = document.getElementById('profile-request-changes');
        if (requestBtn) {
          requestBtn.addEventListener('click', () => {
            // Prefer AccessModal if available
            try {
              if (window.AccessModal && typeof window.AccessModal.open === 'function') {
                window.AccessModal.open();
                return;
              }
            } catch (e) {
              console.warn('AccessModal open attempt failed:', e);
            }

            // Fallback to app handler if present
            if (window.app && typeof window.app.openRequestChangesModal === 'function') {
              try { window.app.openRequestChangesModal(); } catch (e) { console.warn('Fallback openRequestChangesModal failed:', e); }
            }
          });
        }
    const logoutBtn = document.getElementById('profile-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  // Выполняем выход из системы (очищается localStorage в UserStore)
  await window.UserStore.logout();
  // На случай, если logout не удалил ключ (диагностика/резервное удаление)
  try { if (typeof window.UserStore.setCurrentUser === 'function') window.UserStore.setCurrentUser(null); } catch (err) { console.warn('Fallback UserStore.setCurrentUser(null) failed:', err); }

      // Обновляем состояние приложения — пытаемся очистить через метод инстанса приложения
      try {
        if (window.app && typeof window.app.setCurrentUser === 'function') {
          await window.app.setCurrentUser(null);
        } else if (window.AppAccess && typeof window.AppAccess.setCurrentUser === 'function') {
          try {
            await window.AppAccess.setCurrentUser(window.app, null);
          } catch (err) {
            console.warn('AppAccess.setCurrentUser failed:', err);
          }
        } else {
          console.warn('No setCurrentUser available on app or window');
        }
      } catch (e) {
        console.warn('Error while calling setCurrentUser:', e);
      }

      // Обрабатываем изменение состояния аутентификации (UI hooks)
      if (window.app && typeof window.app.handleAuthStateChange === 'function') {
        window.app.handleAuthStateChange(false);
      }

      // Применяем права доступа для гостя — вызываем безопасно на инстансе или глобально
      if (window.app && typeof window.app.applyAccessRules === 'function') {
        try { window.app.applyAccessRules(); } catch (e) { console.warn('app.applyAccessRules failed:', e); }
      } else if (typeof window.applyAccessRules === 'function') {
        try { window.applyAccessRules(window.app); } catch (e) { console.warn('window.applyAccessRules failed:', e); }
      }

      // Перезагружаем страницу для обновления интерфейса
      window.location.reload();
    });

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
              console.log('Финальная инициализация иконок Lucide для профиля завершена');
            } catch (e) { 
              console.warn('Final Lucide initialization warn:', e); 
            }
          }

        // Open access modal when profile access button is clicked
        const accessBtn = document.getElementById('profile-access-modal');
        if (accessBtn) {
          accessBtn.addEventListener('click', async () => {
            try {
              // Preferred API: global AccessModal helper inserted by access-modal.js
              if (window.AccessModal && typeof window.AccessModal.open === 'function') {
                window.AccessModal.open();
                return;
              }
            } catch (e) {
              console.warn('AccessModal.open attempt failed:', e);
            }

            // Fallback: if app exposes init/open functions, try them
            try {
              if (window.app && typeof window.app.openAccessModal === 'function') {
                window.app.openAccessModal();
                return;
              }
            } catch (e) {
              console.warn('app.openAccessModal failed:', e);
            }

            // Last resort: try to import initAccessModal global (some builds expose it)
            try {
              if (typeof initAccessModal === 'function') {
                initAccessModal();
                return;
              }
            } catch (e) {
              console.warn('initAccessModal fallback failed:', e);
            }

            console.warn('No access modal API available to open the access modal');
          });
        }
        }, 50);
      })
      .catch(err => {
        console.error('Не удалось загрузить шаблон профиля:', err);
      });
  }

  /**
   * Update avatar images across all UI locations instantly
   * @param {string} avatarPath - Path to the new avatar image
   * @param {boolean} useCacheBusting - Whether to add timestamp to prevent caching
   */
  updateAvatarInstantly(avatarPath, useCacheBusting = true) {
    const imageUrl = useCacheBusting ? `file://${avatarPath}?t=${Date.now()}` : `file://${avatarPath}`;
    console.log('Мгновенное обновление аватара с URL:', imageUrl);
    
    // Update profile avatar - handle both container and direct img cases
    const profileAvatarContainer = document.querySelector('.h-24.w-24, .h-28.w-28');
    if (profileAvatarContainer) {
      // Check if it already has an img element
      const existingImg = profileAvatarContainer.querySelector('img');
      if (existingImg) {
        // Update existing image
        existingImg.src = imageUrl;
        console.log('Обновлено существующее изображение аватара профиля');
      } else {
        // Create new image element and replace container content
        const img = document.createElement('img');
        img.className = 'h-full w-full object-cover';
        img.onload = () => {
          profileAvatarContainer.innerHTML = '';
          profileAvatarContainer.appendChild(img);
          console.log('Создано новое изображение аватара профиля');
        };
        img.onerror = () => {
          console.warn('Profile avatar load failed, trying without cache-busting');
          img.src = `file://${avatarPath}`;
        };
        img.src = imageUrl;
      }
    }
    
    // Update top bar avatar
    const topBarAvatar = document.getElementById('user-avatar');
    const fallback = document.getElementById('user-avatar-fallback');
    if (topBarAvatar) {
      topBarAvatar.onload = () => {
        topBarAvatar.classList.remove('hidden');
        if (fallback) fallback.classList.add('hidden');
        console.log('Аватар верхней панели загружен и отображен');
      };
      topBarAvatar.onerror = () => {
        console.warn('Top bar avatar load failed, trying without cache-busting');
        topBarAvatar.src = `file://${avatarPath}`;
      };
      topBarAvatar.src = imageUrl;
      console.log('Источник аватара верхней панели обновлен');
    }
    
    // Update modal avatars if present
    const modalAvatars = document.querySelectorAll('#profile-modal-avatar img, .modal img[src*="avatar"]');
    modalAvatars.forEach(img => {
      img.src = imageUrl;
    });
    
    if (modalAvatars.length > 0) {
      console.log(`Обновлено ${modalAvatars.length} аватаров в модальных окнах`);
    }
    
    // Make this function globally available for use by other modules
    if (!window.updateAvatarInstantly) {
      window.updateAvatarInstantly = (path, cacheBust = true) => this.updateAvatarInstantly(path, cacheBust);
    }
  }

  async getCoverImagePath(user) {
    if (!user?.username) {
      return 'file://' + require('path').join(__dirname, '../../assets/cover.jpg').replace(/\\/g, '/');
    }

    // Проверка наличия пользовательских изображений обложки
    const userAssetsPath = require('path').join(__dirname, '../../..', 'Server', 'users', user.username, 'assets');
    const coverExtensions = ['jpg', 'jpeg', 'png'];
    
    for (const ext of coverExtensions) {
      const coverPath = require('path').join(userAssetsPath, `cover.${ext}`);
      try {
        const exists = await window.UserStore.checkAvatarFileExists(coverPath);
        if (exists) {
          return `file://${coverPath.replace(/\\/g, '/')}`;
        }
      } catch (error) {
        console.warn(`Failed to check cover file: ${coverPath}`, error);
      }
    }
    
    // Fallback to default cover
    return 'file://' + require('path').join(__dirname, '../../assets/cover.jpg').replace(/\\/g, '/');
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
      console.log('setupFileUploads: нет пользователя или имени пользователя');
      return;
    }

    console.log('setupFileUploads: настройка для пользователя:', user.username);

    // Cover image upload
    const coverInput = document.getElementById('coverInput');
    console.log('coverInput найден:', !!coverInput);
    if (coverInput) {
      coverInput.addEventListener('change', async (e) => {
        console.log('Вызвано событие изменения coverInput');
        const file = e.target.files[0];
        if (!file) {
          console.log('файл не выбран');
          return;
        }
        console.log('выбран файл:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'cover', user.username);
          console.log('upload result:', result);
          if (result.status === 'success') {
            // Add cache-busting timestamp to prevent browser caching
            const timestamp = Date.now();
            const imageUrl = `file://${result.file_path}?t=${timestamp}`;
            
            // Update current user in store with cover path
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.coverPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }
            
            // Use setTimeout to ensure file system has completed the write operation
            setTimeout(() => {
              const coverImage = document.getElementById('coverImage');
              if (coverImage) {
                coverImage.onload = () => {
                  console.log('Изображение обложки успешно обновлено');
                };
                coverImage.onerror = () => {
                  // Fallback: try loading without cache-busting
                  console.warn('Cover image load with cache-busting failed, trying without timestamp');
                  coverImage.src = `file://${result.file_path}`;
                };
                coverImage.src = imageUrl;
              }
            }, 50); // Small delay to ensure file write completion
            
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
    console.log('avatarInput найден:', !!avatarInput);
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
        console.log('Вызвано событие изменения avatarInput');
        const file = e.target.files[0];
        if (!file) {
          console.log('файл не выбран');
          return;
        }
        console.log('выбран файл:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'avatar', user.username);
          console.log('upload result:', result);
          if (result.status === 'success') {
            // Add cache-busting timestamp to prevent browser caching
            const timestamp = Date.now();
            const imageUrl = `file://${result.file_path}?t=${timestamp}`;
            
            // Update current user in store first
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.avatarPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }

            // Use setTimeout to ensure file system has completed the write operation
            setTimeout(() => {
              console.log('Начало обновления UI аватара с результатом:', result.file_path);
              
              // Use the new instant update method
              this.updateAvatarInstantly(result.file_path, true);
              
              console.log('Обновление UI аватара завершено');
            }, 50); // Reduced delay for faster response

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
    // Проверка типа файла
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

// Экспорт модуля для ES6 import
export default ProfileModule;

// Глобальная доступность для совместимости
window.ProfileModule = ProfileModule;
