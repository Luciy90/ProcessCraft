# Инструкция по установке и запуску ProcessCraft

## Предварительные требования

1. **Node.js** версии 16 или выше
   - Скачайте с [официального сайта](https://nodejs.org/)
   - Проверьте установку: `node --version`

2. **npm** (обычно устанавливается вместе с Node.js)
   - Проверьте установку: `npm --version`

3. **SQL Server 2008** или более новая версия
   - Убедитесь, что сервер запущен и доступен
   - Проверьте, что учетная запись имеет права на подключение

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

3. **Настройте переменные окружения**:
   - Скопируйте [.env.example](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/.env.example) в `.env`
   - Отредактируйте значения в `.env` в соответствии с вашей конфигурацией базы данных:
     ```
     DB_USER=ProcessCraft
     DB_PASSWORD=ProcessCraftPassword
     DB_SERVER=OZO-62\SQLEXPRESS
     DB_DATABASE=ProcessCraftDB
     ```

## Запуск приложения

### Режим разработки
```
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
│           ├── module-loader.js # Динамическая загрузка модулей
│           ├── modules/        # Модули системы
│           └── utils/          # Утилиты
├── assets/                     # Ресурсы
├── scripts/                    # Скрипты сборки
│   └── build-module-index.js   # Автоматическая пересборка index.json
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

Приложение использует Microsoft SQL Server для хранения данных. 

#### Конфигурация подключения

Подключение к базе данных настраивается через переменные окружения:
- `DB_USER` - имя пользователя базы данных
- `DB_PASSWORD` - пароль пользователя
- `DB_SERVER` - адрес сервера SQL Server
- `DB_DATABASE` - имя базы данных

#### Учетные записи пользователей

Приложение использует две учетные записи для подключения к базе данных:

1. **Суперадмин приложения (AppSuperAdmin)**
   - Имя пользователя: AppSuperAdmin
   - Пароль: aA3$!Qp9_superAdminStrongPwd
   - Назначение: Для административных задач, требующих полного доступа к базе данных

2. **Пользователь приложения (AppSuperUser)**
   - Имя пользователя: AppSuperUser
   - Пароль: uU7@#Kx2_superUserStrongPwd
   - Назначение: Для стандартных операций приложения с ограниченными правами доступа к базе данных

**ВАЖНО**: Подробную информацию о системе безопасности базы данных, включая аутентификацию и шифрование учетных данных, см. в [DATABASE_SECURITY.md](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/DATABASE_SECURITY.md).

#### Файл подключения

Файл подключения к базе данных находится в `src/db/connection.js`. Он создает пул соединений с параметрами:
- Максимальное количество соединений: 10
- Таймаут простоя: 30000 миллисекунд
- Шифрование: отключено (для совместимости с SQL Server 2008)

Учетные данные хранятся в зашифрованном виде с использованием AES-256-GCM. Подробнее см. в [src/db/ENCRYPTION_README.md](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/ENCRYPTION_README.md).

### Тестирование подключения

Для проверки подключения к базе данных можно использовать скрипт:
```bash
node src/db/test-connection.js
```


## Поддержка

При возникновении проблем:

1. Проверьте версию Node.js (должна быть 16+)
2. Удалите папку `node_modules` и выполните `npm install` заново
3. Проверьте консоль на наличие ошибок
4. Обратитесь к документации в `README.md`

## Лицензия

MIT License