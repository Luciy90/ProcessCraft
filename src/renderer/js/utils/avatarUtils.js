// Centralized avatar display logic
// This module provides consistent avatar rendering across the application

/**
 * Generate avatar HTML based on user data and container size
 * @param {Object} user - User object with username, displayName, avatarPath
 * @param {Object} options - Display options
 * @param {string} options.size - Size class (sm, md, lg, xl)
 * @param {boolean} options.checkFileExists - Whether to check if avatar file exists
 * @returns {Promise<string>} HTML string for avatar
 */
async function generateAvatarHTML(user, options = {}) {
  const {
    size = 'md',
    checkFileExists = true
  } = options;

  if (!user) {
    return generateFallbackAvatar('?', size);
  }

  // Size mappings
  const sizeMap = {
    sm: { container: 'h-9 w-9', text: 'text-sm' },
    md: { container: 'h-16 w-16', text: 'text-2xl' },
    lg: { container: 'h-24 w-24 md:h-28 md:w-28', text: 'text-4xl md:text-5xl' },
    xl: { container: 'h-32 w-32', text: 'text-6xl' }
  };

  const sizeConfig = sizeMap[size] || sizeMap.md;

  // Check if avatar file exists if path is provided
  if (user.avatarPath && checkFileExists) {
    const fileExists = await window.UserStore.checkAvatarFileExists(user.avatarPath);
    if (fileExists) {
      return `<img src="${user.avatarPath}" class="${sizeConfig.container} object-cover">`;
    }
  } else if (user.avatarPath && !checkFileExists) {
    // Direct image without file check (for performance)
    return `<img src="${user.avatarPath}" class="${sizeConfig.container} object-cover">`;
  }

  // Generate colored letter avatar
  return await generateColoredLetterAvatar(user, sizeConfig);
}

/**
 * Generate colored letter avatar
 * @param {Object} user - User object
 * @param {Object} sizeConfig - Size configuration
 * @returns {Promise<string>} HTML string for colored letter avatar
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
 * Generate fallback avatar with default styling
 * @param {string} letter - Letter to display
 * @param {Object|string} sizeConfig - Size configuration or size key
 * @returns {string} HTML string for fallback avatar
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
 * Update avatar in DOM element
 * @param {string} selector - CSS selector for avatar container
 * @param {Object} user - User object
 * @param {Object} options - Display options
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
 * Generate avatar for top bar (optimized for performance)
 * @param {Object} user - User object
 * @returns {Promise<string>} HTML string for top bar avatar
 */
async function generateTopBarAvatar(user) {
  if (!user) {
    return '👤';
  }

  if (user.avatarPath) {
    const fileExists = await window.UserStore.checkAvatarFileExists(user.avatarPath);
    if (fileExists) {
      return user.avatarPath; // Return path for img.src
    }
  }

  // Generate colored letter
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

// Export functions
window.AvatarUtils = {
  generateAvatarHTML,
  generateColoredLetterAvatar,
  generateFallbackAvatar,
  updateAvatarInDOM,
  generateTopBarAvatar
};
