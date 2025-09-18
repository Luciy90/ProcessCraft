# Краткие инструкции по интеграции динамической загрузки модулей

## Шаги для миграции

### 1. Отключение старой статической регистрации
В `app.js` замените метод `initializeModules()` на вызов динамического загрузчика

### 2. Создание нового модуля
```bash
# 1. Создайте файл модуля
touch src/renderer/js/modules/новый-модуль.js

# 2. Используйте шаблон класса
# 3. Добавьте export default НовыйМодульModule
# 4. Добавьте window.НовыйМодульModule = НовыйМодульModule

# 5. Опционально: создайте .meta.json
touch src/renderer/js/modules/новый-модуль.meta.json

# 6. Обновите index.json
# Добавьте "новый-модуль.js" в массив modules
```

### 3. Проверка moduleId
Убедитесь что moduleId соответствует паттерну: `^[a-z0-9-_]+$`

### 4. Тестирование
```javascript
// В консоли браузера
console.table(window.listModules())  // Список модулей
window.getModule('orders')           // Информация о модуле
window.app.switchModule('orders')    // Переключение модуля
```

## Debug checklist

- [ ] Контейнер модуля существует: `<div id="модуль-module">`
- [ ] Навигация настроена: `[data-module="модуль"]`  
- [ ] Модуль экспортирован: `export default Module; window.Module = Module`
- [ ] index.json обновлен (для браузера)
- [ ] Нет ошибок в консоли
- [ ] moduleId валиден (только a-z, 0-9, -, _)

## Добавление нового модуля за 5 минут

1. **Создать модуль**: `cp orders.js новый.js`
2. **Изменить класс**: `class НовыйModule` 
3. **Обновить moduleId**: `this.moduleId = 'новый'`
4. **Добавить в index.json**: `"новый.js"`
5. **Тест**: `window.app.switchModule('новый')`

## Параметры loadModules()

```javascript
await loadModules({
    path: 'js/modules',    // папка модулей
    dev: true,             // детальные логи  
    lazyLoad: false        // инициализация сразу
});
```

## Hot-reload (только Electron dev)

- Автоматически отслеживает изменения файлов
- Перезагружает модуль без перезапуска приложения
- Работает только в dev режиме с `dev: true`

## Безопасность

- Валидация moduleId: только `[a-z0-9-_]`
- Блокировка путей с `..`
- Импорт только из `js/modules/`
- Изоляция ошибок между модулями