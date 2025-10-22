import { generateAvatarHTML } from '../utils/avatarUtils.js';

class ProfileModule {
  init() {
    this.render().catch(error => {
      console.error('Ошибка рендеринга модуля профиля:', error);
    });
  }

  async render() {
    const container = document.getElementById('profile-module');
    if (!container) return;

    const user = window.UserStore?.getCurrentUser();
    console.log('[Profile] Current user data:', user); // Debug log
    
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
  // Генерация аватара с использованием централизованной логики (импорт модуля)
  const avatar = await generateAvatarHTML(user, { size: 'lg' });
        const adminActions = `
          <div class="flex items-center gap-2">
            <button id="profile-logout" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Выйти</button>
            <button id="profile-admin-list" data-access-marker="profile-admin-list-mark" data-access-description="Управление пользователями" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Пользователи</button>
            <button id="profile-access-modal" data-access-marker="profile-access-modal-mark" data-access-down="profile-admin-list-mark" data-access-description="Управление правами доступа" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Права доступа</button>
            <button id="profile-request-changes" data-access-marker="profile-request-changes-mark" data-access-description="Запросить изменение данных" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">Запросить изменение данных</button>
          </div>`;

        // Определение источника изображения обложки с пользовательским резервным вариантом
        let coverImageSrc;
        if (user?.coverPath) {
          coverImageSrc = `file://${user.coverPath}`;
        } else {
          // Проверка наличия пользовательских изображений обложки, резервный вариант по умолчанию
          coverImageSrc = await this.getCoverImagePath(user);
        }

        console.log('[Profile] Role for display:', role); // Debug log
        
        let out = html
          .replace(/\{\{AVATAR_HTML\}\}/g, avatar)
          .replace(/\{\{DISPLAY_NAME\}\}/g, displayName)
          .replace(/\{\{USERNAME\}\}/g, user?.username || '')
          .replace(/\{\{ROLE\}\}/g, role)
          .replace(/\{\{LAST_LOGIN\}\}/g, lastLogin)
          .replace(/\{\{ADMIN_ACTIONS_CARD\}\}/g, adminActions)
          .replace(/\{\{COVER_IMAGE_SRC\}\}/g, coverImageSrc);

        // Обработка заполнителей UI_CONFIG
        out = this.processUIConfigPlaceholders(out);

        container.innerHTML = out;
        // После динамической вставки шаблона сначала снимаем снимок маркеров и
        // отправляем в main-process, чтобы описания и down-отношения были сохранены
        // до потенциального удаления элементов при применении правил доступа.
        try {
          // Планирование updateAccessMarkers на следующем кадре анимации для обеспечения полного рендеринга DOM
          const scheduleUpdate = () => {
            try {
              if (window.app && typeof window.app.updateAccessMarkers === 'function') {
                window.app.updateAccessMarkers();
              } else if (typeof window.updateAccessMarkers === 'function') {
                window.updateAccessMarkers(window.app);
              }
            } catch (err) {
              console.warn('Ошибка updateAccessMarkers после рендеринга профиля:', err);
            }
          };
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => setTimeout(scheduleUpdate, 0));
          } else {
            // Резервный вариант
            setTimeout(scheduleUpdate, 50);
          }
        } catch (e) {
          console.warn('Ошибка планирования updateAccessMarkers после рендеринга профиля:', e);
        }

        // Затем применяем правила доступа — только после того, как метаданные маркеров
        // надежно отправлены в main-process.
        try {
          if (window.app && typeof window.app.applyAccessRules === 'function') {
            window.app.applyAccessRules();
          } else if (typeof window.applyAccessRules === 'function') {
            window.applyAccessRules(window.app);
          }
        } catch (e) {
          console.warn('Ошибка applyAccessRules после рендеринга профиля:', e);
        }
        
        // Обеспечить отображение иконок Lucide после динамической вставки
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try {
              // Пересоздание иконок специально для контейнера профиля
              window.lucide.createIcons({ 
                attrs: { 'stroke-width': 1.5 },
                container: container 
              });
              console.debug('Иконки Lucide пересозданы для модуля профиля');
            } catch (e) { 
              console.warn('Предупреждение рендеринга Lucide:', e); 
            }
          } else {
            console.error('Lucide недоступен для иконок профиля');
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

        // Всегда прикрепляем обработчики к кнопкам профиля. Контроль доступа должен применяться
        // централизованно через атрибуты data-access-marker и механизм app.applyAccessRules.
        const listBtn = document.getElementById('profile-admin-list');
        if (listBtn) {
          listBtn.addEventListener('click', () => {
            if (window.app && typeof window.app.openAdminPanelModal === 'function') {
              try { window.app.openAdminPanelModal(); } catch (e) { console.warn('Ошибка openAdminPanelModal:', e); }
            }
          });
        }

        const requestBtn = document.getElementById('profile-request-changes');
        if (requestBtn) {
          requestBtn.addEventListener('click', () => {
            // Предпочтение AccessModal, если доступен
            try {
              if (window.AccessModal && typeof window.AccessModal.open === 'function') {
                window.AccessModal.open();
                return;
              }
            } catch (e) {
              console.warn('Попытка открытия AccessModal не удалась:', e);
            }

            // Резервный вариант с обработчиком приложения, если присутствует
            if (window.app && typeof window.app.openRequestChangesModal === 'function') {
              try { window.app.openRequestChangesModal(); } catch (e) { console.warn('Резервный openRequestChangesModal не удался:', e); }
            }
          });
        }
    const logoutBtn = document.getElementById('profile-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  // Выполняем выход из системы (очищается localStorage в UserStore)
  await window.UserStore.logout();
  // На случай, если logout не удалил ключ (диагностика/резервное удаление)
  try { if (typeof window.UserStore.setCurrentUser === 'function') window.UserStore.setCurrentUser(null); } catch (err) { console.warn('Резервный UserStore.setCurrentUser(null) не удался:', err); }

      // Обновляем состояние приложения — пытаемся очистить через метод инстанса приложения
      try {
        if (window.app && typeof window.app.setCurrentUser === 'function') {
          await window.app.setCurrentUser(null);
        } else if (window.AppAccess && typeof window.AppAccess.setCurrentUser === 'function') {
          try {
            await window.AppAccess.setCurrentUser(window.app, null);
          } catch (err) {
            console.warn('Ошибка AppAccess.setCurrentUser:', err);
          }
        } else {
          console.warn('Нет доступного setCurrentUser в приложении или окне');
        }
      } catch (e) {
        console.warn('Ошибка при вызове setCurrentUser:', e);
      }

      // Обрабатываем изменение состояния аутентификации (UI hooks)
      if (window.app && typeof window.app.handleAuthStateChange === 'function') {
        window.app.handleAuthStateChange(false);
      }

      // Применяем права доступа для гостя — вызываем безопасно на инстансе или глобально
      if (window.app && typeof window.app.applyAccessRules === 'function') {
        try { window.app.applyAccessRules(); } catch (e) { console.warn('Ошибка app.applyAccessRules:', e); }
      } else if (typeof window.applyAccessRules === 'function') {
        try { window.applyAccessRules(window.app); } catch (e) { console.warn('Ошибка window.applyAccessRules:', e); }
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
              console.debug('Финальная инициализация иконок Lucide для профиля завершена');
            } catch (e) { 
              console.warn('Предупреждение о финальной инициализации Lucide:', e); 
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
              console.warn('Попытка открытия AccessModal не удалась:', e);
            }

            // Fallback: if app exposes init/open functions, try them
            try {
              if (window.app && typeof window.app.openAccessModal === 'function') {
                window.app.openAccessModal();
                return;
              }
            } catch (e) {
              console.warn('Ошибка app.openAccessModal:', e);
            }

            // Last resort: try to import initAccessModal global (some builds expose it)
            try {
              if (typeof initAccessModal === 'function') {
                initAccessModal();
                return;
              }
            } catch (e) {
              console.warn('Резервный initAccessModal не удался:', e);
            }

            console.warn('Нет доступного API модального окна доступа для открытия модального окна доступа');
          });
        }
        }, 50);
      })
      .catch(err => {
        console.error('Не удалось загрузить шаблон профиля:', err);
      });
  }

  /**
   * Мгновенное обновление изображений аватаров во всех местах пользовательского интерфейса
   * @param {string} avatarPath - Путь к новому изображению аватара
   * @param {boolean} useCacheBusting - Добавлять ли метку времени для предотвращения кэширования
   */
  updateAvatarInstantly(avatarPath, useCacheBusting = true) {
    const imageUrl = useCacheBusting ? `file://${avatarPath}?t=${Date.now()}` : `file://${avatarPath}`;
  console.debug('Мгновенное обновление аватара с URL:', imageUrl);
    
    // Обновление аватара профиля - обработка обоих случаев: контейнер и прямое изображение
    const profileAvatarContainer = document.querySelector('.h-24.w-24, .h-28.w-28');
    if (profileAvatarContainer) {
      // Проверка, есть ли уже элемент img
      const existingImg = profileAvatarContainer.querySelector('img');
      if (existingImg) {
        // Обновление существующего изображения
        existingImg.src = imageUrl;
  console.debug('Обновлено существующее изображение аватара профиля');
      } else {
        // Создание нового элемента изображения и замена содержимого контейнера
        const img = document.createElement('img');
        img.className = 'h-full w-full object-cover';
        img.onload = () => {
          profileAvatarContainer.innerHTML = '';
          profileAvatarContainer.appendChild(img);
          console.debug('Создано новое изображение аватара профиля');
        };
        img.onerror = () => {
          console.warn('Ошибка загрузки аватара профиля, пробуем без обхода кэша');
          img.src = `file://${avatarPath}`;
        };
        img.src = imageUrl;
      }
    }
    
    // Обновление аватара верхней панели
    const topBarAvatar = document.getElementById('user-avatar');
    const fallback = document.getElementById('user-avatar-fallback');
    if (topBarAvatar) {
      topBarAvatar.onload = () => {
        topBarAvatar.classList.remove('hidden');
        if (fallback) fallback.classList.add('hidden');
  console.debug('Аватар верхней панели загружен и отображен');
      };
      topBarAvatar.onerror = () => {
        console.warn('Ошибка загрузки аватара в верхней панели, пробуем без обхода кэша');
        topBarAvatar.src = `file://${avatarPath}`;
      };
      topBarAvatar.src = imageUrl;
  console.debug('Источник аватара верхней панели обновлен');
    }
    
    // Обновление аватаров в модальных окнах, если присутствуют
    const modalAvatars = document.querySelectorAll('#profile-modal-avatar img, .modal img[src*="avatar"]');
    modalAvatars.forEach(img => {
      img.src = imageUrl;
    });
    
    if (modalAvatars.length > 0) {
  console.debug(`Обновлено ${modalAvatars.length} аватаров в модальных окнах`);
    }
    
    // Сделать эту функцию глобально доступной для использования другими модулями
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
        console.warn(`Не удалось проверить файл обложки: ${coverPath}`, error);
      }
    }
    
    // Fallback to default cover
    return 'file://' + require('path').join(__dirname, '../../assets/cover.jpg').replace(/\\/g, '/');
  }

  processUIConfigPlaceholders(html) {
    // Замена заполнителей UI_CONFIG реальными значениями
    const cfg = window.UI_CONFIG;
    if (!cfg) {
      console.warn('UI_CONFIG недоступен для обработки шаблона');
      return html;
    }

    // Замена всех заполнителей UI_CONFIG.texts.profile.*
    return html.replace(/\{\{UI_CONFIG\.([^}]+)\}\}/g, (match, path) => {
      try {
        const keys = path.split('.');
        let value = cfg;
        for (const key of keys) {
          value = value[key];
          if (value === undefined) {
            console.warn(`Путь UI_CONFIG не найден: ${path}`);
            return match; // Возврат оригинального заполнителя, если путь не найден
          }
        }
        return value;
      } catch (error) {
        console.warn(`Ошибка обработки заполнителя UI_CONFIG: ${path}`, error);
        return match; // Возврат оригинального заполнителя при ошибке
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
          console.error('Ошибка копирования email:', err);
          window.app.showMessage('Не удалось скопировать email', 'error');
        }
      });
    }
  }

  setupFileUploads(user) {
    if (!user?.username) {
  console.debug('setupFileUploads: нет пользователя или имени пользователя');
      return;
    }

  console.debug('setupFileUploads: настройка для пользователя:', user.username);

    // Загрузка изображения обложки
    const coverInput = document.getElementById('coverInput');
  console.debug('coverInput найден:', !!coverInput);
    if (coverInput) {
      coverInput.addEventListener('change', async (e) => {
  console.debug('Вызвано событие изменения coverInput');
        const file = e.target.files[0];
        if (!file) {
          console.debug('файл не выбран');
          return;
        }
  console.debug('выбран файл:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'cover', user.username);
          console.debug('upload result:', result);
          if (result.status === 'success') {
            // Добавление метки времени для предотвращения кэширования браузером
            const timestamp = Date.now();
            const imageUrl = `file://${result.file_path}?t=${timestamp}`;
            
            // Update current user in store with cover path
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.coverPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }
            
            // Использование setTimeout для обеспечения завершения операции записи файловой системой
            setTimeout(() => {
              const coverImage = document.getElementById('coverImage');
              if (coverImage) {
                coverImage.onload = () => {
                  console.debug('Изображение обложки успешно обновлено');
                };
                coverImage.onerror = () => {
                  // Резервный вариант: попытка загрузки без обхода кэша
                  console.warn('Ошибка загрузки изображения обложки с обходом кэша, пробуем без временной метки');
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
          console.error('Ошибка загрузки обложки:', err);
          window.app.showMessage('Ошибка при загрузке файла', 'error');
        }
      });
    }

    // Загрузка аватара
    const avatarInput = document.getElementById('avatarInput');
  console.debug('avatarInput найден:', !!avatarInput);
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
  console.debug('Вызвано событие изменения avatarInput');
        const file = e.target.files[0];
        if (!file) {
          console.debug('файл не выбран');
          return;
        }
  console.debug('выбран файл:', file.name, file.type, file.size);

        try {
          const result = await this.uploadFile(file, 'avatar', user.username);
          console.debug('upload result:', result);
          if (result.status === 'success') {
            // Добавление метки времени для предотвращения кэширования браузером
            const timestamp = Date.now();
            const imageUrl = `file://${result.file_path}?t=${timestamp}`;
            
            // Update current user in store first
            const currentUser = window.UserStore.getCurrentUser();
            if (currentUser) {
              currentUser.avatarPath = result.file_path;
              window.UserStore.setCurrentUser(currentUser);
            }

            // Использование setTimeout для обеспечения завершения операции записи файловой системой
            setTimeout(() => {
              console.debug('Начало обновления UI аватара с результатом:', result.file_path);
              
              // Использование нового метода мгновенного обновления
              this.updateAvatarInstantly(result.file_path, true);
              
              console.debug('Обновление UI аватара завершено');
            }, 50); // Уменьшенная задержка для более быстрого ответа

            window.app.showMessage('Аватар обновлен', 'success');
          } else {
            window.app.showMessage(`Ошибка: ${result.message}`, 'error');
          }
        } catch (err) {
          console.error('Ошибка загрузки аватара:', err);
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

    // Преобразование файла в base64 для передачи
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = {
            type: file.type,
            data: reader.result.split(',')[1], // Удаление префикса data:image/...;base64,
            fileName: file.name // Добавление оригинального имени файла
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
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }
}

// Экспорт модуля для ES6 import
export default ProfileModule;

// Глобальная доступность для совместимости
window.ProfileModule = ProfileModule;
