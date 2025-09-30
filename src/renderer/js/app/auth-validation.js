// Валидация учетных данных
// Содержит методы для валидации данных авторизации

/**
 * Валидация данных авторизации
 * @param {Object} app Экземпляр приложения
 * @param {string} username - Логин пользователя
 * @param {string} password - Пароль пользователя
 * @param {Object} authResult - Результат попытки авторизации
 * @returns {Object} Структурированный объект ошибок
 */
export function validateAuthCredentials(app, username, password, authResult = null) {
    const cfg = window.UI_CONFIG;
    const errorTexts = cfg?.texts?.auth?.errors || {};
    
    const validationResult = {
        errors: {},
        auth_error: null,
        hasErrors: false
    };

    // Проверка логина
    const trimmedUsername = username ? username.trim() : '';
    if (!trimmedUsername) {
        validationResult.errors.login = {
            message: errorTexts.login?.required || 'Поле логин обязательно для заполнения',
            highlight: true
        };
        validationResult.hasErrors = true;
    } else if (trimmedUsername.length < 2) {
        validationResult.errors.login = {
            message: errorTexts.login?.invalid_format || 'Некорректный формат логина',
            highlight: true
        };
        validationResult.hasErrors = true;
    }

    // Проверка пароля
    if (!password) {
        validationResult.errors.password = {
            message: errorTexts.password?.required || 'Поле пароль обязательно для заполнения',
            highlight: true
        };
        validationResult.hasErrors = true;
    }

    // Обработка ошибок авторизации (если поля заполнены)
    if (!validationResult.hasErrors && authResult && !authResult.ok) {
        switch (authResult.error) {
            case 'not_found':
                validationResult.errors.login = {
                    message: errorTexts.login?.not_found || 'Пользователь не найден',
                    highlight: true
                };
                validationResult.auth_error = errorTexts.general?.auth_failed || 'Неверный логин или пароль';
                break;
            case 'invalid_password':
                validationResult.errors.password = {
                    message: errorTexts.password?.invalid || 'Неверный пароль',
                    highlight: true
                };
                validationResult.auth_error = errorTexts.general?.auth_failed || 'Неверный логин или пароль';
                break;
            default:
                validationResult.auth_error = errorTexts.general?.server_error || 'Ошибка сервера, попробуйте позже';
        }
        validationResult.hasErrors = true;
    }

    return validationResult;
}

/**
 * Отображение ошибок валидации на форме
 * @param {Object} app Экземпляр приложения
 * @param {Object} validationResult - Результат валидации
 */
export function displayValidationErrors(app, validationResult) {
    // Очистка предыдущих ошибок
    app.clearValidationErrors();

    // Отображение ошибок полей
    Object.keys(validationResult.errors).forEach(fieldName => {
        const fieldError = validationResult.errors[fieldName];
        const input = document.getElementById(`login-${fieldName}`);
        const errorElement = document.getElementById(`${fieldName}-error`);

        if (input && fieldError.highlight) {
            input.classList.add('error');
        }

        if (errorElement && fieldError.message) {
            errorElement.textContent = fieldError.message;
            errorElement.classList.add('show');
        }
    });

    // Отображение общей ошибки авторизации
    if (validationResult.auth_error) {
        const authErrorElement = document.getElementById('auth-error');
        if (authErrorElement) {
            authErrorElement.textContent = validationResult.auth_error;
            authErrorElement.classList.add('show');
        }
    }
}

/**
 * Очистка ошибок валидации
 * @param {Object} app Экземпляр приложения
 */
export function clearValidationErrors(app) {
    // Очистка классов ошибок у полей
    ['login-username', 'login-password'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.classList.remove('error', 'success');
        }
    });

    // Очистка сообщений об ошибках
    ['login-error', 'password-error', 'auth-error'].forEach(errorId => {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    });
}

/**
 * Проверка состояния UI после валидации
 * @param {Object} app Экземпляр приложения
 */
export function validateUIState(app) {
    const loginInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const passwordError = document.getElementById('password-error');
    const authError = document.getElementById('auth-error');
    
    // Проверяем корректность состояния полей и ошибок
    const validationState = {
        fields: {
            login: {
                hasError: loginInput?.classList.contains('error') || false,
                errorMessage: loginError?.textContent || '',
                errorVisible: loginError?.classList.contains('show') || false
            },
            password: {
                hasError: passwordInput?.classList.contains('error') || false,
                errorMessage: passwordError?.textContent || '',
                errorVisible: passwordError?.classList.contains('show') || false
            }
        },
        authError: {
            message: authError?.textContent || '',
            visible: authError?.classList.contains('show') || false
        }
    };
    
    // Логирование для отладки
    console.log('Состояние валидации UI:', validationState);
    
    return validationState;
}