// Централизованная логика отображения аватаров
// Этот модуль обеспечивает согласованное отображение аватаров в приложении

/**
 * Генерация HTML аватара на основе данных пользователя и размера контейнера
 * @param {Object} user - Объект пользователя с username, displayName, avatarPath
 * @param {Object} options - Параметры отображения
 * @param {string} options.size - Класс размера (sm, md, lg, xl)
 * @param {boolean} options.checkFileExists - Проверять ли существование файла аватара
 * @returns {Promise<string>} HTML строка для аватара
 */
async function generateAvatarHTML(user, options = {}) {
  const {
    size = 'md',
    checkFileExists = true
  } = options;

  if (!user) {
    return generateFallbackAvatar('?', size);
  }

  // Соответствия размеров
  const sizeMap = {
    sm: { container: 'h-9 w-9', text: 'text-sm' },
    md: { container: 'h-16 w-16', text: 'text-2xl' },
    lg: { container: 'h-24 w-24 md:h-28 md:w-28', text: 'text-4xl md:text-5xl' },
    xl: { container: 'h-32 w-32', text: 'text-6xl' }
  };

  const sizeConfig = sizeMap[size] || sizeMap.md;


  // Проверить существование файла аватара, если указан путь
  if (user.avatarPath && checkFileExists) {
    const fileExists = await window.UserStore.checkAvatarFileExists(user.avatarPath);
    if (fileExists) {
      return `<img src="${user.avatarPath}" class="${sizeConfig.container} object-cover">`;
    }
  } else if (user.avatarPath && !checkFileExists) {
    // Прямое изображение без проверки файла (для производительности)
    return `<img src="${user.avatarPath}" class="${sizeConfig.container} object-cover">`;
  }

  // Генерация цветного буквенного аватара
  return await generateColoredLetterAvatar(user, sizeConfig);
}

/**
 * Генерация цветного буквенного аватара
 * @param {Object} user - Объект пользователя
 * @param {Object} sizeConfig - Конфигурация размера
 * @returns {Promise<string>} HTML строка для цветного буквенного аватара
 */
async function generateColoredLetterAvatar(user, sizeConfig) {
  const firstLetter = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  
  try {
    const color = await window.UserStore.getAvatarColor(user.username);
    const textColor = `hsl(${color.hue}, ${color.saturation}%, ${color.brightness}%)`;
    
    return `<div class="${sizeConfig.container} flex items-center justify-center font-semibold ${sizeConfig.text}" style="color: ${textColor}; background-color: transparent;">${firstLetter}</div>`;
  } catch (error) {
    console.warn('Failed to get avatar color:', error);
    return generateFallbackAvatar(firstLetter, sizeConfig);
  }
}

/**
 * Генерация резервного аватара со стилем по умолчанию
 * @param {string} letter - Буква для отображения
 * @param {Object|string} sizeConfig - Конфигурация размера или ключ размера
 * @returns {string} HTML строка для резервного аватара
 */
function generateFallbackAvatar(letter, sizeConfig) {
  let config;
  if (typeof sizeConfig === 'string') {
    const sizeMap = {
      sm: { container: 'h-9 w-9', text: 'text-sm' },
      md: { container: 'h-16 w-16', text: 'text-2xl' },
      lg: { container: 'h-24 w-24 md:h-28 md:w-28', text: 'text-4xl md:text-5xl' },
      xl: { container: 'h-32 w-32', text: 'text-6xl' }
    };
    config = sizeMap[sizeConfig] || sizeMap.md;
  } else {
    config = sizeConfig;
  }

  return `<div class="${config.container} flex items-center justify-center font-semibold ${config.text}" style="color: #6b7280; background-color: transparent;">${letter}</div>`;
}

/**
 * Обновление аватара в элементе DOM
 * @param {string} selector - CSS селектор для контейнера аватара
 * @param {Object} user - Объект пользователя
 * @param {Object} options - Параметры отображения
 */
async function updateAvatarInDOM(selector, user, options = {}) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Avatar container not found: ${selector}`);
    return;
  }

  try {
    const avatarHTML = await generateAvatarHTML(user, options);
    element.innerHTML = avatarHTML;
  } catch (error) {
    console.error('Failed to update avatar:', error);
    element.innerHTML = generateFallbackAvatar('?', options.size || 'md');
  }
}

/**
 * Генерация аватара для верхней панели (оптимизировано для производительности)
 * @param {Object} user - Объект пользователя
 * @returns {Promise<string>} HTML строка для аватара верхней панели
 */
async function generateTopBarAvatar(user) {
  if (!user) {
    return '👤';
  }

  if (user.avatarPath) {
    const fileExists = await window.UserStore.checkAvatarFileExists(user.avatarPath);
    if (fileExists) {
      return user.avatarPath; // Возвращаем путь для img.src
    }
  }

  // Генерация цветной буквы
  const firstLetter = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  try {
    const color = await window.UserStore.getAvatarColor(user.username);
    return {
      letter: firstLetter,
      color: `hsl(${color.hue}, ${color.saturation}%, ${color.brightness}%)`
    };
  } catch (error) {
    console.warn('Failed to get avatar color:', error);
    return {
      letter: firstLetter,
      color: '#6b7280'
    };
  }
}

// Экспорт функций
export {
  generateAvatarHTML,
  generateColoredLetterAvatar,
  generateFallbackAvatar,
  updateAvatarInDOM,
  generateTopBarAvatar
};

try {
  if (typeof window !== 'undefined') {
    window.AvatarUtils = window.AvatarUtils || {};
    window.AvatarUtils.generateAvatarHTML = window.AvatarUtils.generateAvatarHTML || generateAvatarHTML;
    window.AvatarUtils.generateColoredLetterAvatar = window.AvatarUtils.generateColoredLetterAvatar || generateColoredLetterAvatar;
    window.AvatarUtils.generateFallbackAvatar = window.AvatarUtils.generateFallbackAvatar || generateFallbackAvatar;
    window.AvatarUtils.updateAvatarInDOM = window.AvatarUtils.updateAvatarInDOM || updateAvatarInDOM;
    window.AvatarUtils.generateTopBarAvatar = window.AvatarUtils.generateTopBarAvatar || generateTopBarAvatar;
  }
} catch (e) {
}