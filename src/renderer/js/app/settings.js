// Настройки приложения
// Содержит методы для работы с настройками приложения

/**
 * Открытие настроек
 * @param {Object} app Экземпляр приложения
 */
export async function openSettings(app) {
    // Рендерим модальное окно через Nunjucks, но шаблон держим inline
    const nunjucks = require('nunjucks');
    const { ipcRenderer } = require('electron');
    const env = new nunjucks.Environment(new nunjucks.PrecompiledLoader({}), { autoescape: true });

    const cfg = window.UI_CONFIG;
    const baseTpl = `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.title) || (cfg.texts && cfg.texts.buttons && cfg.texts.buttons.settings) || 'Настройки'}</div>
        <button onclick="window.app.closeModal()" class="h-8 w-8 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5">✕</button>
      </div>
      <div class="space-y-3">
        <div class="text-sm text-white/70">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.version_label) || 'Версия'}: {{ version }}</div>
        <div class="grid grid-cols-1 gap-3">
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <span class="text-sm">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.notifications) || 'Уведомления'}</span>
            <input type="checkbox" id="notifications-enabled" {% if settings.notifications %}checked{% endif %}>
          </label>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <span class="text-sm">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.autosave) || 'Автосохранение'}</span>
            <input type="checkbox" id="autosave-enabled" {% if settings.autosave %}checked{% endif %}>
          </label>
          <div class="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div class="text-xs text-white/60 mb-1">${(cfg.texts && cfg.texts.settings && cfg.texts.settings.db_path) || 'Путь к базе данных'}</div>
            <input class="w-full bg-transparent text-sm border border-white/10 rounded px-2 py-1.5" id="db-path" value="" readonly>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="window.app.closeModal()" class="h-9 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-sm">${cfg.texts.buttons.cancel}</button>
        <button onclick="window.app.saveSettings && window.app.saveSettings()" class="h-9 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-sm">${cfg.texts.buttons.save}</button>
      </div>
    </div>`;

    env.addTemplate('settings_inline.html', baseTpl);
    const html = env.render('settings_inline.html', {
        version: await ipcRenderer.invoke('get-app-version'),
        user: { name: 'Администратор', role: 'admin' },
        settings: { notifications: true, autosave: true }
    });
    app.showModal(html);

    try {
        const dbPath = await app.getDatabasePath();
        const input = document.getElementById('db-path');
        if (input) input.value = dbPath || '';
    } catch (e) {
        console.error('Не удалось получить путь к БД', e);
    }
}

/**
 * Получение пути к базе данных
 * @param {Object} app Экземпляр приложения
 * @returns {string} Путь к базе данных
 */
export async function getDatabasePath(app) {
    const { ipcRenderer } = require('electron');
    return await ipcRenderer.invoke('get-app-path');
}