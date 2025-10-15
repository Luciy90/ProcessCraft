# Безопасность базы данных ProcessCraft

Этот документ объединяет и обновляет всю информацию о безопасности базы данных в приложении ProcessCraft, включая систему аутентификации, шифрование учетных данных и настройку подключения.

## Обзор

ProcessCraft использует Microsoft SQL Server 2008 в качестве сервера базы данных. Для обеспечения безопасности учетных данных и подключения реализована двухуровневая система:

1. **Система аутентификации** - хранит хеши паролей пользователей
2. **Система шифрования** - шифрует учетные данные для подключения к базе данных

## Учетные записи пользователей базы данных

### Суперадмин приложения
- **Имя пользователя**: AppSuperAdmin
- **Пароль**: aA3$!Qp9_superAdminStrongPwd (хешируется и не хранится в открытом виде)
- **Назначение**: Для административных задач, требующих полного доступа к базе данных
- **Тип учетной записи**: superadmin

### Обычный пользователь приложения
- **Имя пользователя**: AppSuperUser
- **Пароль**: uU7@#Kx2_superUserStrongPwd (хешируется и не хранится в открытом виде)
- **Назначение**: Для стандартных операций приложения с ограниченными правами доступа к базе данных
- **Тип учетной записи**: regular

## Система аутентификации

### Компоненты

#### 1. Сервис аутентификации ([src/db/auth-service.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/auth-service.js))
Основной компонент системы, отвечающий за:
- Хеширование паролей с использованием PBKDF2
- Верификацию паролей
- Управление учетными записями пользователей
- Хранение хешей паролей в отдельной базе данных

#### 2. База данных аутентификации ([src/db/auth-db.json](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/auth-db.json))
Содержит хеши паролей и соли:
```json
{
  "users": {
    "AppSuperAdmin": {
      "username": "AppSuperAdmin",
      "hash": "хеш_пароля",
      "salt": "соль"
    },
    "AppSuperUser": {
      "username": "AppSuperUser",
      "hash": "хеш_пароля",
      "salt": "соль"
    }
  }
}
```

#### 3. Хранилище учетных данных ([src/db/credentials-store.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/credentials-store.js))
Хранит только имена пользователей и типы учетных записей без паролей:
```json
{
  "superadmin": {
    "username": "AppSuperAdmin",
    "userType": "superadmin"
  },
  "regular": {
    "username": "AppSuperUser",
    "userType": "regular"
  }
}
```

### Безопасность аутентификации

#### Хеширование паролей
Пароли хешируются с использованием алгоритма PBKDF2:
- 10,000 итераций
- Длина хеша: 64 байта
- Алгоритм хеширования: SHA-512
- Уникальная соль для каждого пароля

#### Хранение данных
- Пароли не хранятся в открытом виде
- Хеши паролей хранятся отдельно от имен пользователей
- Доступ к базе данных аутентификации ограничен

## Система шифрования учетных данных

### Компоненты

#### 1. Модуль шифрования ([src/db/encryption.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/encryption.js))
Обеспечивает шифрование и дешифрование учетных данных базы данных с использованием AES-256-GCM.

#### 2. Хранилище зашифрованных учетных данных ([src/db/encrypted-credentials.json](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/encrypted-credentials.json))
Хранит зашифрованные учетные данные для резервной системы подключения.

### Особенности шифрования

- **Алгоритм**: AES-256-GCM для аутентифицированного шифрования
- **Обнаружение подделки**: через теги аутентификации
- **Безопасное получение ключа**: с использованием scrypt
- **Поддержка типов пользователей**: superadmin и regular

## Настройка подключения к базе данных

### Конфигурация

Подключение к базе данных настраивается с помощью переменных окружения. Создайте файл `.env` в корневой директории проекта:

```env
DB_USER=AppSuperUser
DB_PASSWORD=uU7@#Kx2_superUserStrongPwd
DB_SERVER=OZO-62\SQLEXPRESS
DB_DATABASE=ProcessCraftDB
```

### Настройки пула подключений

Пул подключений сконфигурирован со следующими параметрами:
- Максимум подключений: 10
- Минимум подключений: 0
- Таймаут простоя: 30000 миллисекунд (30 секунд)
- Шифрование: Отключено (требуется для совместимости с SQL Server 2008)

### Логика подключения

1. Если установлены переменные окружения `DB_USER` и `DB_PASSWORD`, они используются напрямую
2. В противном случае зашифрованные учетные данные загружаются из хранилища учетных данных
3. Если оба метода не удалась, используются учетные данные по умолчанию

## Использование

### Аутентификация пользователя
```javascript
const { verifyUserCredentials } = require('./src/db/auth-service');

// Проверка учетных данных пользователя
const isValid = verifyUserCredentials('AppSuperAdmin', 'aA3$!Qp9_superAdminStrongPwd');
if (isValid) {
  console.log('Аутентификация успешна');
} else {
  console.log('Неверные учетные данные');
}
```

### Подключение к базе данных
```javascript
const { initializeConnection } = require('./src/db/connection');

// Подключение к базе данных с учетными данными суперадмина
const pool = await initializeConnection('superadmin');
```

### Шифрование/дешифрование данных
```javascript
const { encrypt, decrypt } = require('./src/db/encryption');

// Шифрование данных
const encrypted = encrypt('конфиденциальные данные');

// Дешифрование данных
const decrypted = decrypt(encrypted);
```

## Тестирование

### Запуск тестов аутентификации
```bash
node src/db/test-auth-service.js
```

### Запуск тестов шифрования
```bash
node src/db/test-encryption.js
```

### Запуск тестов подключения к базе данных
```bash
node src/db/test-connection.js
```

## Безопасность

### Рекомендации по безопасности

1. **В производственной среде**:
   - Не храните пароли в коде
   - Используйте переменные окружения для учетных данных базы данных
   - Регулярно меняйте пароли
   - Используйте сложные пароли

2. **Дополнительные меры безопасности**:
   - Реализуйте ограничение попыток входа
   - Добавьте двухфакторную аутентификацию
   - Используйте HTTPS для всех сетевых соединений
   - Регулярно обновляйте зависимости

3. **Управление ключами шифрования**:
   - Используйте безопасную службу управления ключами (Azure Key Vault, AWS KMS)
   - Реализуйте политики ротации ключей
   - Никогда не жестко кодируйте ключи шифрования

4. **Хранение учетных данных**:
   - Используйте безопасное хранение в базе данных вместо файлов JSON
   - Реализуйте контроль доступа к хранилищу учетных данных
   - Шифруйте хранилище при хранении

## Интеграция с приложением

### В точке входа приложения
Система аутентификации инициализируется автоматически при первом обращении.

### При аутентификации пользователя
1. Пользователь вводит имя и пароль
2. Приложение вызывает `verifyUserCredentials()`
3. Если аутентификация успешна, пользователь получает доступ к приложению

### При подключении к базе данных
1. Приложение определяет тип пользователя
2. Загружает имя пользователя из хранилища учетных данных
3. Использует захардкодированные учетные данные для подключения к SQL Server
4. В производственной среде учетные данные должны быть в переменных окружения

## Устранение неполадок

### Частые проблемы

1. **Ошибка аутентификации**: Проверьте правильность имени пользователя и пароля
2. **Таймаут подключения**: Проверьте, запущен ли SQL Server и доступен ли он
3. **Нет доступа к таблице**: Убедитесь, что учетная запись имеет необходимые права доступа
4. **База данных не найдена**: Убедитесь, что база данных существует на сервере

### Сообщения об ошибках

- "Login failed for user 'AppSuperUser'": Неправильное имя пользователя или пароль
- "Database connection failed": Проверьте адрес сервера и сетевое подключение
- "The specified database 'ProcessCraftDB' does not exist": База данных не существует на сервере

## Файлы системы безопасности

### Аутентификация
1. [src/db/auth-service.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/auth-service.js) - Основной сервис аутентификации
2. [src/db/auth-db.json](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/auth-db.json) - База данных с хешами паролей
3. [src/db/user-credentials.json](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/user-credentials.json) - Хранилище имен пользователей
4. [src/db/test-auth-service.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/test-auth-service.js) - Тесты сервиса аутентификации

### Шифрование
1. [src/db/encryption.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/encryption.js) - Модуль шифрования
2. [src/db/credentials-store.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/credentials-store.js) - Хранилище учетных данных
3. [src/db/test-encryption.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/test-encryption.js) - Тесты шифрования
4. [src/db/test-credentials-store.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/test-credentials-store.js) - Тесты хранилища учетных данных

### Подключение
1. [src/db/connection.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/connection.js) - Модуль подключения к базе данных
2. [src/db/test-connection.js](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/src/db/test-connection.js) - Тесты подключения к базе данных

### Документация
1. [DB_CONNECTION.md](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/DB_CONNECTION.md) - Настройка подключения к базе данных
2. [DATABASE_SECURITY.md](file:///c%3A/Users/KodochigovV/Documents/Projects/ProcessCraft/DATABASE_SECURITY.md) - Этот документ (безопасность базы данных)