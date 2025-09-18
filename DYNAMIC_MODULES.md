# Динамическая система загрузки модулей ProcessCraft

## Быстрый старт

### 1. Подключение загрузчика
Добавьте в `index.html` тег script для module-loader.js:
```html
<script type="module" src="js/module-loader.js"></script>
```

### 2. Использование в app.js
Замените статическую инициализацию модулей на динамическую:
```javascript
// Старый способ (удалить)
this.modules = {
    dashboard: new DashboardModule(),
    orders: new OrdersModule(),
    // ...
};

// Новый способ (добавить)
const loadResult = await window.loadModules({
    path: 'js/modules',
    dev: true,
    lazyLoad: false
});
```

### 3. Создание нового модуля
1. Создайте файл `src/renderer/js/modules/новый-модуль.js`
2. Используйте шаблон класса модуля:
```javascript
class НовыйМодульModule {
    constructor(options = {}) {
        this.moduleId = options.moduleId || 'новый-модуль';
        this.meta = options.meta || {};
    }
    
    async init() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        // UI рендеринг
    }
    
    setupEventListeners() {
        // Обработчики событий
    }
    
    async destroy() {
        // Очистка ресурсов
    }
}

export default НовыйМодульModule;
window.НовыйМодульModule = НовыйМодульModule;
```

### 4. Опциональные метаданные
Создайте файл `новый-модуль.meta.json`:
```json
{
    "moduleId": "новый-модуль",
    "moduleName": "Название модуля",
    "version": "1.0.0",
    "enabled": true
}
```

### 5. Обновление index.json
Добавьте новый модуль в `src/renderer/js/modules/index.json`:
```json
{
    "modules": [
        "dashboard.js",
        "orders.js",
        "новый-модуль.js"
    ]
}
```

## API функции

### Основные функции
```javascript
// Загрузка модулей
await loadModules({ path: 'js/modules', dev: true })

// Получение модуля
const module = window.getModule('orders')

// Получение экземпляра модуля
const instance = window.getModuleInstance('orders')

// Список всех модулей
const modules = window.listModules()

// Проверка доступности
if (window.isModuleAvailable('orders')) { /* ... */ }
```

### События
```javascript
// Обработка загрузки модулей
document.addEventListener('modules:loaded', (event) => {
    console.log('Загружено модулей:', event.detail.success);
});
```

## Режимы работы

### Development режим
```javascript
await loadModules({
    path: 'js/modules',
    dev: true,        // Подробные логи
    lazyLoad: false   // Инициализация сразу
});
```

### Production режим
```javascript
await loadModules({
    path: 'js/modules',
    dev: false,
    lazyLoad: true    // Ленивая загрузка
});
```

## Отладка

### Проверочный чеклист
1. Контейнер модуля существует в HTML: `<div id="модуль-module">`
2. Модуль появился в навигации: `[data-module="модуль"]`
3. Модуль в реестре: `window.moduleRegistry.has('модуль')`
4. Статус модуля: `window.getModule('модуль').status === 'initialized'`

### Debug команды в консоли
```javascript
// Информация о модулях
console.table(window.listModules())

// Реестр модулей
console.log(window.moduleRegistry)

// Загрузчик модулей (dev режим)
console.log(window.moduleLoader)

// Переключение модуля вручную
window.app.switchModule('orders')
```

### Типичные ошибки
- **Модуль не найден**: Проверьте имя файла и moduleId
- **Контейнер не найден**: Добавьте `<div id="модуль-module">` в HTML
- **Ошибка импорта**: Убедитесь что модуль экспортирует класс правильно
- **Hot-reload не работает**: Включите dev режим в loadModules()

## Безопасность

### Валидация moduleId
- Разрешены только символы: `a-z`, `0-9`, `-`, `_`
- Запрещены пути с `..`
- Только файлы `.js`

### Ограничения
- Импорт только из доверенной папки `js/modules`
- Изоляция ошибок между модулями
- Обязательная валидация интерфейса модуля

## Миграция с статической загрузки

### Шаг 1: Резервная копия
Сохраните текущий `app.js` как `app.js.backup`

### Шаг 2: Обновление модулей
Добавьте в каждый модуль:
```javascript
// В конец файла модуля
export default МодульModule;
window.МодульModule = МодульModule;
```

### Шаг 3: Замена initializeModules()
Замените метод в app.js согласно примеру выше

### Шаг 4: Тестирование
1. Проверьте консоль на ошибки
2. Убедитесь что все модули загружаются
3. Протестируйте переключение между модулями

### Шаг 5: Очистка
Удалите старый код статической инициализации

## Hot-reload (только Electron + dev режим)

Автоматическая перезагрузка модулей при изменении файлов:
- Использует `chokidar` или `fs.watch`
- Вызывает `destroy()` на старом экземпляре
- Повторно импортирует и инициализирует модуль
- Только в development режиме