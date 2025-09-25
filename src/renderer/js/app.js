// Основной файл приложения ProcessCraft
// Содержит только импорты модулей приложения

// ==================== БАЗОВЫЕ ИМПОРТЫ И ИНИЦИАЛИЗАЦИЯ ====================
// Импорт ядра приложения - содержит основной класс ProcessCraftApp
import ProcessCraftApp from './app/app-core.js';

// Импорт инициализации приложения - содержит основную логику запуска приложения
import { initializeApp } from './app/app-initialization.js';

// ==================== ОБРАБОТКА СОБЫТИЙ ЗАГРУЗКИ МОДУЛЕЙ ====================
// Импорт обработчиков событий загрузки модулей - содержит методы для работы с событиями загрузки модулей
import { onModulesLoaded, updateNavigationFromModules } from './app/modules-events.js';

// ==================== ТЕСТИРОВАНИЕ МОДУЛЕЙ ====================
// Импорт методов тестирования модулей - содержит функции для тестирования переключения модулей
import { testModuleSwitching } from './app/modules-testing.js';

// ==================== РЕНДЕРИНГ ИНТЕРФЕЙСА ====================
// Импорт методов рендеринга интерфейса - содержит функции для отображения UI на основе конфейга
import { renderChromeFromConfig } from './app/ui-rendering.js';

// ==================== УПРАВЛЕНИЕ СОБЫТИЯМИ ====================
// Импорт обработчиков событий - содержит методы для настройки и обработки событий приложения
import { setupEventListeners, setupNavigationListeners, handleNavigationClick } from './app/event-handling.js';

// ==================== ПЕРЕКЛЮЧЕНИЕ МОДУЛЕЙ ====================
// Импорт методов переключения модулей - содержит функции для переключения между модулями приложения
import { switchModule, getModule } from './app/modules-switching.js';

// ==================== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ ====================
// Импорт методов инициализации модулей - содержит функции для загрузки и инициализации модулей
import { initializeModules, initializeModulesStatic } from './app/modules-initialization.js';

// ==================== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКИМ ИНТЕРФЕЙСОМ ====================
// Импорт методов управления UI - содержит функции для работы с пользовательским интерфейсом
import { updateUserInterface, renderUserAvatar } from './app/user-interface.js';

// ==================== МОДАЛЬНЫЕ ОКНА ВХОДА ====================
// Импорт методов работы с формой входа - содержит функции для отображения и обработки формы входа
import { openLoginModal, showForgotPasswordHelp } from './app/login-modal.js';

// ==================== ВАЛИДАЦИЯ УЧЕТНЫХ ДАННЫХ ====================
// Импорт методов валидации - содержит функции для проверки данных авторизации
import { validateAuthCredentials, displayValidationErrors, clearValidationErrors, validateUIState } from './app/auth-validation.js';

// ==================== РАБОТА С ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ ====================
// Импорт методов работы с профилем - содержит функции для отображения и управления профилем пользователя
import { openProfileModal, openProfilePage } from './app/user-profile.js';

// ==================== ПАНЕЛЬ АДМИНИСТРАТОРА ====================
// Импорт методов панели администратора - содержит функции для управления пользователями в панели администратора
import { openAdminPanelModal } from './app/admin-panel.js';

// ==================== РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================
// Импорт методов редактирования пользователей - содержит функции для создания и редактирования пользователей
import { openEditUserModal, openRequestChangesModal, openCreateUserModal } from './app/user-editing.js';

// ==================== ДАННЫЕ ПАНЕЛИ УПРАВЛЕНИЯ ====================
// Импорт методов работы с данными дашборда - содержит функции для загрузки данных панели управления
import { loadDashboardData } from './app/dashboard-data.js';

// ==================== УВЕДОМЛЕНИЯ ====================
// Импорт методов работы с уведомлениями - содержит функции для управления уведомлениями приложения
import { toggleNotifications, loadNotifications, markNotificationAsRead, formatTime } from './app/notifications.js';

// ==================== НАСТРОЙКИ ====================
// Импорт методов работы с настройками - содержит функции для управления настройками приложения
import { openSettings, getDatabasePath } from './app/settings.js';

// ==================== МОДАЛЬНЫЕ ОКНА ====================
// Импорт методов работы с модальными окнами - содержит функции для отображения и управления модальными окнами
import { showModal, closeModal, openFile } from './app/modal-windows.js';

// ==================== УТИЛИТЫ ====================
// Импорт вспомогательных методов - содержит утилиты для работы с сообщениями и уведомлениями
import { showMessage, updateNotificationBadge } from './app/utils.js';

// ==================== ИНИЦИАЛИЗАЦИЯ DOM ====================
// Импорт методов инициализации DOM - содержит функции для инициализации приложения при загрузке DOM
import { initializeDOM } from './app/dom-initialization.js';

// ==================== РАСШИРЕНИЕ КЛАССА ПРИЛОЖЕНИЯ ====================
// Добавляем все импортированные методы к прототипу класса ProcessCraftApp

// Методы инициализации
ProcessCraftApp.prototype.init = function() { return initializeApp(this); };

// Методы обработки событий загрузки модулей
ProcessCraftApp.prototype.onModulesLoaded = function(detail) { return onModulesLoaded(this, detail); };
ProcessCraftApp.prototype.updateNavigationFromModules = function(loadedModules) { return updateNavigationFromModules(this, loadedModules); };

// Методы тестирования модулей
ProcessCraftApp.prototype.testModuleSwitching = function() { return testModuleSwitching(this); };

// Методы рендеринга интерфейса
ProcessCraftApp.prototype.renderChromeFromConfig = function() { return renderChromeFromConfig(this); };

// Методы управления событиями
ProcessCraftApp.prototype.setupEventListeners = function() { return setupEventListeners(this); };
ProcessCraftApp.prototype.setupNavigationListeners = function() { return setupNavigationListeners(this); };
ProcessCraftApp.prototype.handleNavigationClick = function(e) { return handleNavigationClick(this, e); };

// Методы переключения модулей
ProcessCraftApp.prototype.switchModule = function(moduleName) { return switchModule(this, moduleName); };
ProcessCraftApp.prototype.getModule = function(moduleName) { return getModule(this, moduleName); };

// Методы инициализации модулей
ProcessCraftApp.prototype.initializeModules = function() { return initializeModules(this); };
ProcessCraftApp.prototype.initializeModulesStatic = function() { return initializeModulesStatic(this); };

// Методы управления пользовательским интерфейсом
ProcessCraftApp.prototype.updateUserInterface = function() { return updateUserInterface(this); };
ProcessCraftApp.prototype.renderUserAvatar = function() { return renderUserAvatar(this); };

// Методы работы с модальными окнами входа
ProcessCraftApp.prototype.openLoginModal = function() { return openLoginModal(this); };
ProcessCraftApp.prototype.showForgotPasswordHelp = function() { return showForgotPasswordHelp(this); };

// Методы валидации учетных данных
ProcessCraftApp.prototype.validateAuthCredentials = function(username, password, authResult = null) { return validateAuthCredentials(this, username, password, authResult); };
ProcessCraftApp.prototype.displayValidationErrors = function(validationResult) { return displayValidationErrors(this, validationResult); };
ProcessCraftApp.prototype.clearValidationErrors = function() { return clearValidationErrors(this); };
ProcessCraftApp.prototype.validateUIState = function() { return validateUIState(this); };

// Методы работы с профилем пользователя
ProcessCraftApp.prototype.openProfileModal = function(user) { return openProfileModal(this, user); };
ProcessCraftApp.prototype.openProfilePage = function() { return openProfilePage(this); };

// Методы панели администратора
ProcessCraftApp.prototype.openAdminPanelModal = function() { return openAdminPanelModal(this); };

// Методы редактирования пользователей
ProcessCraftApp.prototype.openEditUserModal = function(user) { return openEditUserModal(this, user); };
ProcessCraftApp.prototype.openRequestChangesModal = function() { return openRequestChangesModal(this); };
ProcessCraftApp.prototype.openCreateUserModal = function() { return openCreateUserModal(this); };

// Методы работы с данными панели управления
ProcessCraftApp.prototype.loadDashboardData = function() { return loadDashboardData(this); };

// Методы работы с уведомлениями
ProcessCraftApp.prototype.toggleNotifications = function() { return toggleNotifications(this); };
ProcessCraftApp.prototype.loadNotifications = function() { return loadNotifications(this); };
ProcessCraftApp.prototype.markNotificationAsRead = function(notificationId) { return markNotificationAsRead(this, notificationId); };
ProcessCraftApp.prototype.formatTime = function(timestamp) { return formatTime(this, timestamp); };

// Методы работы с настройками
ProcessCraftApp.prototype.openSettings = function() { return openSettings(this); };
ProcessCraftApp.prototype.getDatabasePath = function() { return getDatabasePath(this); };

// Методы работы с модальными окнами
ProcessCraftApp.prototype.showModal = function(content) { return showModal(this, content); };
ProcessCraftApp.prototype.closeModal = function() { return closeModal(this); };
ProcessCraftApp.prototype.openFile = function() { return openFile(this); };

// Утилиты
ProcessCraftApp.prototype.showMessage = function(message, type = 'info') { return showMessage(this, message, type); };
ProcessCraftApp.prototype.updateNotificationBadge = function() { return updateNotificationBadge(this); };

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', function() { 
    initializeDOM().catch(error => {
        console.error('Error initializing DOM:', error);
    });
});

// Экспорт для ES6 модулей
export default ProcessCraftApp;