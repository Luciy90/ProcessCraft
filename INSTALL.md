# Инструкция по установке и запуску ProcessCraft

## Предварительные требования

1. **Node.js** версии 16 или выше
   - Скачайте с [официального сайта](https://nodejs.org/)
   - Проверьте установку: `node --version`

2. **npm** (обычно устанавливается вместе с Node.js)
   - Проверьте установку: `npm --version`

## Установка проекта

1. **Клонируйте репозиторий** (если используете Git):
   ```bash
   git clone <repository-url>
   cd ProcessCraft
   ```

2. **Установите зависимости**:
   ```bash
   npm install
   ```

## Запуск приложения

### Режим разработки
```bash
npm run dev
```

### Обычный запуск
```bash
npm start
```

## Сборка приложения

### Создание исполняемого файла
```bash
npm run build
```

### Создание дистрибутива
```bash
npm run dist
```

## Структура проекта

```
ProcessCraft/
├── src/
│   ├── main.js                 # Основной процесс Electron
│   └── renderer/               # Файлы интерфейса
│       ├── index.html          # Главная страница
│       ├── styles/             # CSS стили
│       │   ├── main.css        # Основные стили
│       │   ├── components.css  # Стили компонентов
│       │   └── modules.css     # Стили модулей
│       └── js/                 # JavaScript файлы
│           ├── app.js          # Основное приложение
│           ├── modules/        # Модули системы
│           └── utils/          # Утилиты
├── assets/                     # Ресурсы
├── package.json               # Конфигурация проекта
└── README.md                  # Документация
```

## Возможные проблемы и решения

### Ошибка "electron not found"
```bash
npm install electron --save-dev
```

### Ошибка "electron-builder not found"
```bash
npm install electron-builder --save-dev
```

### Проблемы с правами доступа (Windows)
Запустите командную строку от имени администратора

### Проблемы с правами доступа (Linux/Mac)
```bash
sudo npm install
```

## Разработка

### Добавление нового модуля

1. Создайте файл модуля в `src/renderer/js/modules/`
2. Добавьте модуль в навигацию в `src/renderer/index.html`
3. Инициализируйте модуль в `src/renderer/js/app.js`

### Стилизация

- Основные стили: `src/renderer/styles/main.css`
- Стили компонентов: `src/renderer/styles/components.css`
- Стили модулей: `src/renderer/styles/modules.css`

### Отладка

1. В режиме разработки автоматически открываются DevTools
2. Используйте `console.log()` для отладки
3. Проверяйте консоль браузера для ошибок

## База данных

Приложение использует JSON файлы для хранения данных. Все данные сохраняются в папке:
- Windows: `%APPDATA%\.processcraft\database\`
- Linux: `~/.config/.processcraft/database/`
- macOS: `~/Library/Application Support/.processcraft/database/`

## Поддержка

При возникновении проблем:

1. Проверьте версию Node.js (должна быть 16+)
2. Удалите папку `node_modules` и выполните `npm install` заново
3. Проверьте консоль на наличие ошибок
4. Обратитесь к документации в `README.md`

## Лицензия

MIT License



