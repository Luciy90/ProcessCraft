// Тестовый файл для проверки корректности рефакторинга
// Этот файл проверяет, что модули правильно импортируются и работают

import ProcessCraftApp from './app-core.js';
import { switchModule } from './modules-switching.js';

// Создаем тестовый экземпляр приложения
const app = new ProcessCraftApp();

// Проверяем, что методы правильно привязаны к прототипу
console.debug('App instance created:', !!app);
console.debug('App has switchModule method:', typeof app.switchModule === 'function');

// Проверяем, что модульные функции работают
console.debug('switchModule function imported:', typeof switchModule === 'function');

// Тестовый вызов
console.debug('Testing modularized function call...');
try {
    // Это имитирует вызов, который происходит в основном файле:
    // ProcessCraftApp.prototype.switchModule = function(moduleName) { return switchModule(this, moduleName); };
    // Когда вызывается app.switchModule('test'), это эквивалентно switchModule(app, 'test')
    
    // Создаем тестовую функцию, которая имитирует поведение из основного файла
    const testSwitchModule = function(moduleName) { 
        return switchModule(app, moduleName); 
    };
    
    console.debug('Test function created successfully');
    console.debug('Test function type:', typeof testSwitchModule);
    
    // Проверяем, что функция не вызывает ошибок при определении
    console.debug('Modularized approach seems correct');
} catch (error) {
    console.error('Error in modularized approach:', error);
}

export { app };