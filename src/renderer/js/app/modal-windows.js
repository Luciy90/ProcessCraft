// Модальные окна приложения
// Содержит методы для работы с модальными окнами

/**
 * Отображение модального окна
 * @param {Object} app Экземпляр приложения
 * @param {string} content Содержимое модального окна
 */
export function showModal(app, content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

/**
 * Закрытие модального окна
 * @param {Object} app Экземпляр приложения
 */
export function closeModal(app) {
    document.getElementById('modal-overlay').classList.add('hidden');
}

/**
 * Открытие файла
 * @param {Object} app Экземпляр приложения
 */
export function openFile(app) {
    const { ipcRenderer } = require('electron');
    ipcRenderer.invoke('dialog:open-file').then(filePath => {
        if (filePath) {
            console.log('Выбран файл:', filePath);
            // Здесь будет логика загрузки файла
        }
    }).catch(err => console.error('Ошибка открытия файла:', err));
}