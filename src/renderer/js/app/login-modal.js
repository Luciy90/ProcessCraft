// Модальное окно входа в систему
// Содержит методы для отображения и обработки формы входа

/**
 * Открытие модального окна входа
 * @param {Object} app Экземпляр приложения
 */
export function openLoginModal(app) {
    const cfg = window.UI_CONFIG;
    const t = cfg?.texts?.auth || {};
    const html = `
    <!-- From Uiverse.io by gharsh11032000 -->
    <div class="form-container">
      <form id="login-form" class="form">
        <div class="form-group">
          <label for="login-username">${t.login?.label || 'Логин'}</label>
          <input
            type="text"
            id="login-username"
            name="username"
            placeholder="${t.login?.placeholder || 'Введите логин'}"
            autocomplete="username"
            required
          />
          <div id="login-error" class="field-error">
            ${t.errors?.login?.not_found || 'Пользователь не найден'}
          </div>
        </div>
        <div class="form-group">
          <label for="login-password">${t.password?.label || 'Пароль'}</label>
          <input
            type="password"
            id="login-password"
            name="password"
            placeholder="${t.password?.placeholder || 'Введите пароль'}"
            autocomplete="current-password"
            required
          />
          <div id="password-error" class="field-error"></div>
        </div>
        <div id="auth-error" class="auth-error">
          ${t.errors?.general?.auth_failed || 'Неверный логин или пароль'}
        </div>
        <div class="form-actions">
          <button class="form-submit-btn" type="submit">${t.buttons?.login || 'Войти'}</button>
          <button type="button" id="forgot-password-btn" class="forgot-password-btn">${t.buttons?.forgot_password || 'Забыли пароль?'}</button>
        </div>
      </form>
    </div>`;
  app.showModal(html);

  // Robustly attach submit handler: try direct binding first, fallback to delegation on modal container.
  const modalContent = document.getElementById('modal-content');
  const attachHandler = (formEl) => {
    if (!formEl) return;
    // Prevent duplicate handlers
    if (formEl.__loginHandlerAttached) return;
    formEl.__loginHandlerAttached = true;

    const handleSubmit = async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      // Очистка предыдущих ошибок
      app.clearValidationErrors();

      const submitBtn = formEl.querySelector('button[type="submit"]');
      const originalSubmitText = submitBtn ? submitBtn.textContent : '';
      const cfg = window.UI_CONFIG;
      const authTexts = cfg?.texts?.auth?.messages || {};

      // Предварительная валидация (проверка заполненности полей)
      const preliminaryValidation = app.validateAuthCredentials(username, password);

      if (preliminaryValidation.hasErrors) {
        app.displayValidationErrors(preliminaryValidation);
        return;
      }

      // Показываем состояние загрузки
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.textContent = authTexts.loading || 'Выполняется вход...';
      }

      try {
        const authResult = await window.UserStore.login(username, password);

        if (authResult?.ok) {
          // Успешная авторизация
          app.closeModal();
          app.updateUserInterface().catch(console.warn);
          app.openProfilePage();
          app.showMessage(authTexts.success || 'Успешный вход в систему', 'success');

          // Обрабатываем изменение состояния аутентификации
          if (app.handleAuthStateChange) {
            app.handleAuthStateChange(true);
          }

          // Применяем права доступа для вошедшего пользователя
          if (app.applyAccessRules) {
            app.applyAccessRules(app);
          }

          // Перезагружаем страницу для обновления интерфейса
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          // Ошибка авторизации - валидация с результатом сервера
          const validationResult = app.validateAuthCredentials(username, password, authResult);
          app.displayValidationErrors(validationResult);

          console.warn('Auth failed:', {
            username: username,
            error: authResult?.error,
            validationResult: validationResult
          });
        }
      } catch (error) {
        console.error('Login error:', error);

        const networkValidation = {
          errors: {},
          auth_error: cfg?.texts?.auth?.errors?.general?.network_error || 'Ошибка сети, проверьте подключение',
          hasErrors: true
        };

        app.displayValidationErrors(networkValidation);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn-loading');
          submitBtn.textContent = originalSubmitText;
        }

        app.validateUIState();
      }
    };

    formEl.addEventListener('submit', handleSubmit);
  };

  // Try immediate direct binding
  const form = document.getElementById('login-form');
  if (form) {
    attachHandler(form);
  } else if (modalContent) {
    // Delegate: listen for submit events bubbling from forms inside modalContent
    modalContent.addEventListener('submit', (e) => {
      // Ensure it's the login form
      const targetForm = e.target && e.target.id === 'login-form' ? e.target : null;
      if (targetForm) {
        attachHandler(targetForm);
        // Re-dispatch submit so attached handler runs; prevent default here to avoid duplicate behavior
        // Note: handler attached above will handle the event because attachHandler registers before we return
      }
    });
    console.debug('[login-modal] delegated submit handler attached to modal container');
  } else {
    console.warn('[login-modal] modal content container not found; login handler not attached');
  }

  // Обработчик для "Забыли пароль?" — ищем внутри модального содержимого
  const forgotPasswordBtn = document.getElementById('forgot-password-btn') || (modalContent && modalContent.querySelector('#forgot-password-btn'));
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
      app.showForgotPasswordHelp();
    });
  }
}

/**
 * Отображение помощи по восстановлению пароля
 * @param {Object} app Экземпляр приложения
 */
export function showForgotPasswordHelp(app) {
    const cfg = window.UI_CONFIG;
    const t = cfg?.texts?.password_recovery || {};
    const html = `
    <div class="form-container space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">${t.title || '🔒 Восстановление пароля'}</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      
      <div class="rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
        <div class="flex items-start gap-3">
          <div class="text-amber-400 text-xl">ℹ️</div>
          <div class="flex-1">
            <div class="text-sm font-medium text-amber-200 mb-2">${t.how_to_recover || 'Как восстановирь пароль?'}</div>
            <div class="text-xs text-white/80 space-y-2">
              <p>${t.instruction || 'Для сброса пароля обратитесь к администратору системы.'}</p>
              <p><strong>${t.what_to_tell || 'Что сообщить администратору:'}:</strong></p>
              <ul class="list-disc list-inside text-xs space-y-1 ml-2">
                <li>${t.instructions?.username || 'Ваш логин (имя пользователя)'}</li>
                <li>${t.instructions?.problem || 'Описание проблемы (забыли пароль)'}</li>
                <li>${t.instructions?.contact_info || 'Контактную информацию для связи'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div class="rounded-lg border border-blue-400/20 bg-blue-500/5 p-4">
        <div class="flex items-start gap-3">
          <div class="text-blue-400 text-xl">👥</div>
          <div class="flex-1">
            <div class="text-sm font-medium text-blue-200 mb-2">${t.contacts_title || 'Контакты администрации'}</div>
            <div class="text-xs text-white/80">
              <p>${t.contacts_text || 'Обратитесь к системному администратору вашей организации или IT-поддержке для получения нового пароля.'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between items-center pt-2">
        <button onclick="window.app.openLoginModal()" class="text-xs text-white/60 hover:text-white/80 underline">${t.buttons?.back_to_login || '← Назад к входу'}</button>
        <button onclick="window.app.closeModal()" class="h-9 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${t.buttons?.understood || 'Понятно'}</button>
      </div>
    </div>`;
    app.showModal(html);
}