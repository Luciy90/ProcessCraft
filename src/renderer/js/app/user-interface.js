// Управление пользовательским интерфейсом
// Содержит методы для работы с пользовательским интерфейсом

import { generateTopBarAvatar } from '../utils/avatarUtils.js';

/**
 * Обновление пользовательского интерфейса
 * @param {Object} app Экземпляр приложения
 */
export async function updateUserInterface(app) {
    const current = window.UserStore?.getCurrentUser();
    const userBtn = document.getElementById('user-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (current) {
        // Пользователь авторизован - показываем аватар, скрываем кнопку входа
        if (userBtn) userBtn.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
        await app.renderUserAvatar();
    } else {
        // Пользователь не авторизован - скрываем аватар, показываем кнопку входа
        if (userBtn) userBtn.classList.add('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
    }
}

/**
 * Отображение аватара пользователя
 * @param {Object} app Экземпляр приложения
 */
export async function renderUserAvatar(app) {
    const current = window.UserStore?.getCurrentUser();
    const img = document.getElementById('user-avatar');
    const fallback = document.getElementById('user-avatar-fallback');
    if (!img || !fallback) return;

    try {
        // Use module function to get avatar for top bar
        const avatarData = await generateTopBarAvatar(current);
        
        if (typeof avatarData === 'string') {
            // Image path
            img.src = avatarData;
            img.classList.remove('hidden');
            fallback.classList.add('hidden');
        } else if (avatarData && typeof avatarData === 'object') {
            // Colored letter
            fallback.textContent = avatarData.letter;
            fallback.style.backgroundColor = 'transparent';
            fallback.style.color = avatarData.color;
            fallback.style.fontWeight = '600';
            img.classList.add('hidden');
            fallback.classList.remove('hidden');
        } else {
            // Not authenticated
            fallback.textContent = '👤';
            fallback.style.backgroundColor = '';
            fallback.style.color = '';
            fallback.style.fontWeight = '';
            img.classList.add('hidden');
            fallback.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to render user avatar:', error);
        fallback.textContent = '👤';
        fallback.style.backgroundColor = '';
        fallback.style.color = '';
        fallback.style.fontWeight = '';
        img.classList.add('hidden');
        fallback.classList.remove('hidden');
    }
}