-- =========================================================
-- Чек-лист этапов
-- =========================================================
-- 1) Создание БД ProcessCraftBD и логинов/пользователей БД
-- 2) Создание ролей БД и назначение членств/прав
-- 3) Создание таблиц (DDL) с комментариями к каждому ключу
-- 4) Назначение внешних ключей и уникальных ограничений (в т.ч. ON DELETE CASCADE)
-- 5) Инициализация системных ролей (SuperAdmin, Admin, User)
-- 5.5) Инициализация первого пользователя 'Admin'
-- 6) Реализация триггеров защиты системных ролей и переназначения удаляемых ролей
-- Важно перед выполнением обязательно задайте свой пароль для учетной записи Администратора и пользователя.
-- После продублируйте его в .env пред выполнением src\db\setup-db-access.js
-- =========================================================


-- =========================================================
-- 1. Создание БД
-- =========================================================
IF DB_ID(N'ProcessCraftBD') IS NULL
BEGIN
    CREATE DATABASE [ProcessCraftBD];
    PRINT N'-- 1.1: База данных [ProcessCraftBD] успешно создана.';
END
ELSE
BEGIN
    PRINT N'-- 1.1: База данных [ProcessCraftBD] уже существует. Пропуск создания.';
END
GO

USE [ProcessCraftBD];
GO
PRINT N'-- 1.2: Выбрана база данных [ProcessCraftBD] для дальнейшей настройки.';
GO

-- =========================================================
-- 2. Создание логинов, пользователей и ролей БД
-- =========================================================

-- Логин для главного администратора (AppSuperAdmin)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'AppSuperAdmin')
BEGIN
    CREATE LOGIN [AppSuperAdmin]
    WITH PASSWORD = N'aA3$!Qp9_superAdminStrongPwd',
          CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
    PRINT N'-- 2.1: Логин [AppSuperAdmin] создан.';
END
ELSE
BEGIN
    PRINT N'-- 2.1: Логин [AppSuperAdmin] уже существует. Пропуск создания.';
END
GO

-- Логин для основного доступа приложения (AppSuperUser)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'AppSuperUser')
BEGIN
    CREATE LOGIN [AppSuperUser]
    WITH PASSWORD = N'uU7@!Kx2_superUserStrongPwd',
          CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;
    PRINT N'-- 2.2: Логин [AppSuperUser] создан.';
END
ELSE
BEGIN
    PRINT N'-- 2.2: Логин [AppSuperUser] уже существует. Пропуск создания.';
END
GO

-- Пользователи БД, связанные с логинами
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'AppSuperAdmin')
BEGIN
    CREATE USER [AppSuperAdmin] FOR LOGIN [AppSuperAdmin];
    PRINT N'-- 2.3: Пользователь БД [AppSuperAdmin] создан.';
END
ELSE
BEGIN
    PRINT N'-- 2.3: Пользователь БД [AppSuperAdmin] уже существует. Пропуск создания.';
END

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'AppSuperUser')
BEGIN
    CREATE USER [AppSuperUser] FOR LOGIN [AppSuperUser];
    PRINT N'-- 2.4: Пользователь БД [AppSuperUser] создан.';
END
ELSE
BEGIN
    PRINT N'-- 2.4: Пользователь БД [AppSuperUser] уже существует. Пропуск создания.';
END
GO

-- Создание ролей БД для управления доступом к схемам/таблицам
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'AppSuperAdminRole')
BEGIN
    CREATE ROLE [AppSuperAdminRole];
    PRINT N'-- 2.5: Роль БД [AppSuperAdminRole] создана.';
END
ELSE
BEGIN
    PRINT N'-- 2.5: Роль БД [AppSuperAdminRole] уже существует. Пропуск создания.';
END

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'AppSuperUserRole')
BEGIN
    CREATE ROLE [AppSuperUserRole];
    PRINT N'-- 2.6: Роль БД [AppSuperUserRole] создана.';
END
ELSE
BEGIN
    PRINT N'-- 2.6: Роль БД [AppSuperUserRole] уже существует. Пропуск создания.';
END
GO

-- Назначение членства в ролях БД
EXEC sp_addrolemember N'AppSuperAdminRole', N'AppSuperAdmin'; -- Администратор БД
EXEC sp_addrolemember N'AppSuperUserRole',  N'AppSuperUser'; -- Пользователь БД для приложения
PRINT N'-- 2.7: Членство в ролях БД настроено.';
GO

-- Права доступа для ролей БД
-- AppSuperAdminRole получает полные права (владелец схемы)
EXEC sp_addrolemember N'db_owner', N'AppSuperAdmin';
-- AppSuperUserRole получает права на CRUD и выполнение хранимых процедур
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[dbo] TO [AppSuperUserRole];
GRANT EXECUTE ON SCHEMA::[dbo] TO [AppSuperUserRole];
PRINT N'-- 2.8: Права доступа для ролей БД настроены.';
GO


-- =========================================================
-- 3. Создание базовых таблиц (DDL)
-- =========================================================

-- Таблица: Roles (Роли в приложении)
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
CREATE TABLE dbo.Roles
(
    RoleID              INT             NOT NULL,           -- Уникальный идентификатор роли (PK), фиксированные ID для системных ролей (1, 2, 3)
    RoleName            VARCHAR(50)     NOT NULL,           -- Название роли (уникальный ключ, например, 'SuperAdmin')
    RoleDisplay         NVARCHAR(100)   NOT NULL,           -- Отображаемое название роли (для UI)
    RoleDescription     NVARCHAR(255)   NULL,               -- Описание роли
    CONSTRAINT PK_Roles PRIMARY KEY (RoleID),
    CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
);

-- Таблица: Users (Пользователи приложения)
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
CREATE TABLE dbo.Users
(
    UserID              INT IDENTITY(1,1) NOT NULL,         -- Уникальный идентификатор пользователя (PK, автоинкремент)
    DisplayName         NVARCHAR(100)   NOT NULL,           -- Реальное имя пользователя (ФИО)
    UserName            VARCHAR(50)     NOT NULL,           -- Имя пользователя (логин), должно быть уникальным
    Email               VARCHAR(100)    NULL,               -- Текстовое поле для почты (должно быть уникальным, может быть NULL)
    Phone               VARCHAR(20)     NULL,               -- Текстовое поле для номера телефона
    Department          NVARCHAR(100)   NULL,               -- Подразделение пользователя
    Position            NVARCHAR(100)   NULL,               -- Должность пользователя
    PasswordHash        VARCHAR(255)    NOT NULL,           -- Хеш пароля для аутентификации
    IsSuperAdmin        BIT             NOT NULL CONSTRAINT DF_Users_IsSuperAdmin DEFAULT (0), -- Флаг, указывающий на высшие административные права (для операций AppSuperAdmin)
    IsActive            BIT             NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1), -- Статус активности пользователя (0 - заблокирован, 1 - активен)
    AvatarPath          VARCHAR(255)    NULL,               -- Место расположения аватара (URL или путь к файлу)
    AvatarColorHue      INT             NULL,               -- Числовое значение оттенка цвета аватара (0-360)
    AvatarColorSaturation INT           NULL,               -- Числовое значение насыщенности цвета аватара (0-100)
    AvatarColorBrightness INT           NULL,               -- Числовое значение яркости цвета аватара (0-100)
    CoverPath           VARCHAR(255)    NULL,               -- Место расположения фонового изображения/обложки
    CreatedAt           DATETIME        NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (GETDATE()), -- Дата создания записи
    LastLoginAt         DATETIME        NULL,               -- Дата последнего входа
    UpdatedAt           DATETIME        NULL,               -- Дата обновления данных
    CONSTRAINT PK_Users PRIMARY KEY (UserID),
    CONSTRAINT UQ_Users_UserName UNIQUE (UserName),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);

-- Таблица: Modules (Модули приложения)
IF OBJECT_ID(N'dbo.Modules', N'U') IS NOT NULL DROP TABLE dbo.Modules;
CREATE TABLE dbo.Modules
(
    ModuleID            INT IDENTITY(1,1) NOT NULL,         -- Уникальный идентификатор модуля (PK, автоинкремент)
    ModuleName          VARCHAR(50)     NOT NULL,           -- Имя модуля, должно быть уникальным
    TableName           VARCHAR(100)    NOT NULL,           -- Имя связанной таблицы данных в БД (для ORM/доступа)
    PathModule          VARCHAR(255)    NOT NULL,           -- Место расположения/URL модуля
    coverPath           VARCHAR(255)    NULL,               -- Место расположения обложки/иконки модуля
    VersionModule       VARCHAR(50)     NULL,               -- Версия модуля
    ModuleActive        BIT             NOT NULL CONSTRAINT DF_Modules_ModuleActive DEFAULT (1), -- Статус активности модуля (1 - включен, 0 - отключен)
    CreatedModule       DATETIME        NOT NULL CONSTRAINT DF_Modules_CreatedModule DEFAULT (GETDATE()), -- Дата добавления модуля
    CONSTRAINT PK_Modules PRIMARY KEY (ModuleID),
    CONSTRAINT UQ_Modules_ModuleName UNIQUE (ModuleName),
    CONSTRAINT UQ_Modules_TableName UNIQUE (TableName)
);

-- Таблица: Marker (Маркеры разрешений)
IF OBJECT_ID(N'dbo.Marker', N'U') IS NOT NULL DROP TABLE dbo.Marker;
CREATE TABLE dbo.Marker
(
    MarkerID            INT IDENTITY(1,1) NOT NULL,         -- Уникальный идентификатор маркера (PK, автоинкремент)
    MarkerName          VARCHAR(100)    NOT NULL,           -- Имя маркера (например, 'ПросмотрОтчетов')
    MarkerDescription   NVARCHAR(255)   NULL,               -- Описание маркера (для UI)
    MarkerParent        INT             NULL,               -- Ссылка на родительский маркер (для иерархии)
    Path                VARCHAR(255)    NULL,               -- Опциональный путь, связанный с маркером
    CONSTRAINT PK_Marker PRIMARY KEY (MarkerID)
    -- FK_Marker_MarkerParent добавляется на шаге 4 (самоссылающийся FK)
);

-- Таблица-связка: UserRoles (Связь Пользователей и ролей)
IF OBJECT_ID(N'dbo.UserRoles', N'U') IS NOT NULL DROP TABLE dbo.UserRoles;
CREATE TABLE dbo.UserRoles
(
    UserID              INT             NOT NULL,           -- ID пользователя (FK к dbo.Users)
    RoleID              INT             NOT NULL,           -- ID роли (FK к dbo.Roles)
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserID, RoleID)     -- Составной первичный ключ для уникальности пары
);

-- Таблица-связка: AccessModule (Разрешения Пользователь-Модуль)
IF OBJECT_ID(N'dbo.AccessModule', N'U') IS NOT NULL DROP TABLE dbo.AccessModule;
CREATE TABLE dbo.AccessModule
(
    AccessModuleID      INT IDENTITY(1,1) NOT NULL,         -- Уникальный идентификатор записи о доступе (PK, автоинкремент)
    DisplayOrderINT     INT             NULL,               -- Номер для иерархии отображения в колонке (для UI)
    UserID              INT             NOT NULL,           -- ID пользователя (FK к dbo.Users)
    ModuleID            INT             NOT NULL,           -- ID модуля (FK к dbo.Modules)
    PermissionType      INT             NOT NULL,           -- Битовая маска разрешений (0-7):
                                                            -- 1 = Read (Чтение)
                                                            -- 2 = Write (Запись/Изменение)
                                                            -- 4 = Execute/Display (Выполнение/Отображение)
                                                            -- 7 = 1+2+4 (Все разрешено)
    CONSTRAINT PK_AccessModule PRIMARY KEY (AccessModuleID),
    CONSTRAINT CK_AccessModule_PermissionType CHECK (PermissionType BETWEEN 0 AND 7)
);

-- Таблица-связка: AccessMarker (Разрешения Пользователь-Маркер)
IF OBJECT_ID(N'dbo.AccessMarker', N'U') IS NOT NULL DROP TABLE dbo.AccessMarker;
CREATE TABLE dbo.AccessMarker -- Исправлено: Имя таблицы AccessMarker для соответствия DROP/ALTER и логике именования
(
    AccessMarkerID      INT IDENTITY(1,1) NOT NULL,         -- Уникальный идентификатор записи (PK, автоинкремент)
    UserID              INT             NOT NULL,           -- ID пользователя (FK к dbo.Users)
    MarkerID            INT             NOT NULL,           -- ID маркера (FK к dbo.Marker)
    CONSTRAINT PK_AccessMarker PRIMARY KEY (AccessMarkerID)
);

PRINT N'-- 3.0: Базовые таблицы (Roles, Users, Modules, Marker, UserRoles, AccessModule, AccessMarker) созданы или пересозданы.';
GO

-- =========================================================
-- 4. Внешние ключи и каскады
-- =========================================================

-- Самоссылающийся FK для иерархии маркеров
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Marker_MarkerParent' AND parent_object_id = OBJECT_ID('dbo.Marker'))
    ALTER TABLE dbo.Marker
    ADD CONSTRAINT FK_Marker_MarkerParent
        FOREIGN KEY (MarkerParent)
        REFERENCES dbo.Marker (MarkerID)
        ON DELETE NO ACTION -- Нельзя удалить родителя без удаления всех потомков вручную
        ON UPDATE NO ACTION;

-- FK для UserRoles (FK_UserRoles_Users всегда добавляется, так как таблицы пересоздаются)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Users' AND parent_object_id = OBJECT_ID('dbo.UserRoles'))
    ALTER TABLE dbo.UserRoles
    ADD CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Roles' AND parent_object_id = OBJECT_ID('dbo.UserRoles'))
    ALTER TABLE dbo.UserRoles
    ADD CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleID) REFERENCES dbo.Roles(RoleID) ON DELETE NO ACTION;

-- FK и уникальность для AccessModule
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AccessModule_Users' AND parent_object_id = OBJECT_ID('dbo.AccessModule'))
    ALTER TABLE dbo.AccessModule
    ADD CONSTRAINT FK_AccessModule_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AccessModule_Modules' AND parent_object_id = OBJECT_ID('dbo.AccessModule'))
    ALTER TABLE dbo.AccessModule
    ADD CONSTRAINT FK_AccessModule_Modules FOREIGN KEY (ModuleID) REFERENCES dbo.Modules(ModuleID) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_AccessModule_User_Module' AND parent_object_id = OBJECT_ID('dbo.AccessModule'))
    ALTER TABLE dbo.AccessModule ADD CONSTRAINT UQ_AccessModule_User_Module UNIQUE (UserID, ModuleID); -- Уникальность пары (UserID, ModuleID)

-- FK и уникальность для AccessMarker
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AccessMarker_Users' AND parent_object_id = OBJECT_ID('dbo.AccessMarker'))
    ALTER TABLE dbo.AccessMarker
    ADD CONSTRAINT FK_AccessMarker_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AccessMarker_Marker' AND parent_object_id = OBJECT_ID('dbo.AccessMarker'))
    ALTER TABLE dbo.AccessMarker
    ADD CONSTRAINT FK_AccessMarker_Marker FOREIGN KEY (MarkerID) REFERENCES dbo.Marker(MarkerID) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_AccessMarker_User_Marker' AND parent_object_id = OBJECT_ID('dbo.AccessMarker'))
    ALTER TABLE dbo.AccessMarker ADD CONSTRAINT UQ_AccessMarker_User_Marker UNIQUE (UserID, MarkerID); -- Уникальность пары (UserID, MarkerID)

PRINT N'-- 4.0: Внешние ключи и уникальные ограничения добавлены.';
GO


-- =========================================================
-- 5. Инициализация системных ролей
-- =========================================================
MERGE dbo.Roles AS T
USING (VALUES
    (1, 'SuperAdmin', N'Супер Администратор', N'Полные права доступа в приложении'),
    (2, 'Admin',       N'Администратор',       N'Ограниченное управление пользователями и настройками'),
    (3, 'User',        N'Пользователь',        N'Базовый доступ и просмотр данных')
) AS S (RoleID, RoleName, RoleDisplay, RoleDescription)
ON T.RoleID = S.RoleID
WHEN NOT MATCHED BY TARGET THEN
    INSERT (RoleID, RoleName, RoleDisplay, RoleDescription)
    VALUES (S.RoleID, S.RoleName, S.RoleDisplay, S.RoleDescription)
WHEN MATCHED THEN
    UPDATE SET T.RoleDisplay = S.RoleDisplay, T.RoleDescription = S.RoleDescription; -- Разрешаем обновление только отображаемых полей

PRINT N'-- 5.0: Системные роли (SuperAdmin, Admin, User) инициализированы/обновлены.';
GO

-- =========================================================
-- 5.5. Инициализация первого пользователя 'Admin'
-- =========================================================
BEGIN
    -- ВНИМАНИЕ: В реальном приложении здесь должен использоваться хеш, сгенерированный программой
    -- Используется стартовый хеш для предоставления первого входа в систему "1111".
    DECLARE @AdminPasswordHash VARCHAR(255) = '94b2e299c29568b940e6a185eb865e79f249aeab8c49dbc8a463bcd031bb2223$c50cd6533e0a56138900649f8567d872734b83201c432c086c041d43bdba38eff047e5f213af78d8e18a93421321a183a7ed0219d644d6891f2be3d4b6f0e451';
    DECLARE @AdminUserID INT;
    DECLARE @UserAction NVARCHAR(50);
    
    -- 1. Проверка и создание/обновление пользователя 'Admin'
    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserName = N'Admin')
    BEGIN
        INSERT INTO dbo.Users (DisplayName, UserName, Email, Phone, Department, Position, PasswordHash, IsSuperAdmin, AvatarColorHue, AvatarColorSaturation, AvatarColorBrightness, UpdatedAt)
        VALUES (
            N'Управляющий',
            N'Admin',
            NULL,
            NULL,
            NULL,
            N'Системный администратор',
            @AdminPasswordHash,
            1, -- IsSuperAdmin = 1
            4,   -- AvatarColorHue
            80,  -- AvatarColorSaturation
            80,  -- AvatarColorBrightness
            GETDATE()
        );
        SET @AdminUserID = SCOPE_IDENTITY();
        SET @UserAction = N'создан';
    END
    ELSE
    BEGIN
        -- Получение существующего UserID и обновление данных
        SELECT @AdminUserID = UserID FROM dbo.Users WHERE UserName = N'Admin';
        
        UPDATE dbo.Users
        SET DisplayName = N'Управляющий',
            Position = N'Системный администратор',
            IsSuperAdmin = 1,
            AvatarColorHue = 4,
            AvatarColorSaturation = 80,
            AvatarColorBrightness = 80,
            UpdatedAt = GETDATE()
        WHERE UserID = @AdminUserID
        AND (DisplayName <> N'Управляющий'
        OR Position <> N'Системный администратор' 
        OR IsSuperAdmin <> 1
        OR PasswordHash <> @AdminPasswordHash)
        OR ISNULL(AvatarColorHue, -1) <> 4
        OR ISNULL(AvatarColorSaturation, -1) <> 80
        OR ISNULL(AvatarColorBrightness, -1) <> 80;
        
        IF @@ROWCOUNT > 0
            SET @UserAction = N'обновлен';
        ELSE
            SET @UserAction = N'существовал и соответствует конфигурации';
    END
    
    IF @UserAction = N'создан'
        PRINT N'-- 5.5.1: Пользователь ''Admin'' (Управляющий) успешно создан (UserID=' + CAST(@AdminUserID AS NVARCHAR(10)) + N').';
    ELSE IF @UserAction = N'обновлен'
        PRINT N'-- 5.5.1: Существующий пользователь ''Admin'' (UserID=' + CAST(@AdminUserID AS NVARCHAR(10)) + N') успешно обновлен.';
    ELSE
        PRINT N'-- 5.5.1: Пользователь ''Admin'' (UserID=' + CAST(@AdminUserID AS NVARCHAR(10)) + N') уже существует и соответствует конфигурации. Пропуск создания/обновления.';

    -- 2. Назначение роли SuperAdmin (RoleID=1)
    IF @AdminUserID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserID = @AdminUserID AND RoleID = 1)
    BEGIN
        INSERT INTO dbo.UserRoles (UserID, RoleID)
        VALUES (@AdminUserID, 1); -- RoleID=1 is SuperAdmin
        PRINT N'-- 5.5.2: Роль SuperAdmin (1) назначена пользователю ''Admin''.';
    END
    ELSE IF @AdminUserID IS NOT NULL
    BEGIN
        PRINT N'-- 5.5.2: Роль SuperAdmin (1) уже назначена пользователю ''Admin''. Пропуск назначения.';
    END
END
GO


-- =========================================================
-- 6. Триггеры защиты и переназначения системных ролей
-- =========================================================

-- Триггер: TR_Roles_PreventSystemRoleChanges
-- Запрещает изменение RoleID и RoleName для системных ролей (1, 2, 3).
IF OBJECT_ID(N'dbo.TR_Roles_PreventSystemRoleChanges', N'TR') IS NOT NULL
    DROP TRIGGER dbo.TR_Roles_PreventSystemRoleChanges;
GO
CREATE TRIGGER dbo.TR_Roles_PreventSystemRoleChanges
ON dbo.Roles
INSTEAD OF UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Проверяем попытку изменения RoleID или RoleName для системных ролей
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN deleted d ON i.RoleID = d.RoleID
        WHERE i.RoleID IN (1,2,3)
          AND (ISNULL(i.RoleName,'') <> ISNULL(d.RoleName,'') OR i.RoleID <> d.RoleID) -- Проверка на изменение RoleID/RoleName
    )
    BEGIN
        RAISERROR(N'Изменение RoleID/RoleName для системных ролей (1,2,3) запрещено.',16,1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;

    -- Разрешаем обновление прочих столбцов (RoleDisplay, RoleDescription)
    UPDATE r
    SET r.RoleName = i.RoleName,
        r.RoleDisplay = i.RoleDisplay,
        r.RoleDescription = i.RoleDescription
    FROM dbo.Roles r
    JOIN inserted i ON r.RoleID = i.RoleID;
END;
GO
PRINT N'-- 6.1: Триггер TR_Roles_PreventSystemRoleChanges создан.';
GO

-- Триггер: TR_Roles_DeleteReassign
-- Запрещает удаление системных ролей (1, 2, 3) и переназначает пользователей удаляемых ролей на RoleID=3 (User).
IF OBJECT_ID(N'dbo.TR_Roles_DeleteReassign', N'TR') IS NOT NULL
    DROP TRIGGER dbo.TR_Roles_DeleteReassign;
GO
CREATE TRIGGER dbo.TR_Roles_DeleteReassign
ON dbo.Roles
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Блокируем удаление системных ролей
    IF EXISTS (SELECT 1 FROM deleted WHERE RoleID IN (1,2,3))
    BEGIN
        RAISERROR(N'Удаление системных ролей (1,2,3) запрещено.',16,1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;

    -- 1. Переназначаем пользователей удаляемых ролей на RoleID=3 (User), если у них еще нет этой роли
    WITH DelRoles AS (
        SELECT DISTINCT RoleID FROM deleted
    ),
    AffectedUsers AS (
        SELECT DISTINCT ur.UserID
        FROM dbo.UserRoles ur
        JOIN DelRoles dr ON ur.RoleID = dr.RoleID
    )
    INSERT INTO dbo.UserRoles (UserID, RoleID)
    SELECT au.UserID, 3 -- 3 соответствует роли "User"
    FROM AffectedUsers au
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.UserRoles ur2
        WHERE ur2.UserID = au.UserID AND ur2.RoleID = 3
    );

    -- 2. Удаляем связи пользователей с удаляемыми ролями
    DELETE ur
    FROM dbo.UserRoles ur
    JOIN deleted d ON ur.RoleID = d.RoleID;

    -- 3. Удаляем сами роли
    DELETE r
    FROM dbo.Roles r
    JOIN deleted d ON r.RoleID = d.RoleID;
END;
GO
PRINT N'-- 6.2: Триггер TR_Roles_DeleteReassign создан.';
GO

-- Триггер: TR_Users_PreventIsSuperAdminChange
-- Запрещает изменение флага IsSuperAdmin для всех пользователей
IF OBJECT_ID(N'dbo.TR_Users_PreventIsSuperAdminChange', N'TR') IS NOT NULL
    DROP TRIGGER dbo.TR_Users_PreventIsSuperAdminChange;
GO

CREATE TRIGGER dbo.TR_Users_PreventIsSuperAdminChange
ON dbo.Users
INSTEAD OF UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Проверяем, пытается ли кто-то изменить IsSuperAdmin
    IF UPDATE(IsSuperAdmin)
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM inserted i
            JOIN deleted d ON i.UserID = d.UserID
            WHERE i.IsSuperAdmin <> d.IsSuperAdmin
        )
        BEGIN
            RAISERROR(N'Изменение флага IsSuperAdmin запрещено для всех пользователей, включая администраторов.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
    END

    -- Если изменения IsSuperAdmin нет — разрешаем обновление остальных полей
    UPDATE u
    SET
        u.DisplayName = i.DisplayName,
        u.UserName = i.UserName,
        u.Email = i.Email,
        u.Phone = i.Phone,
        u.Department = i.Department,
        u.Position = i.Position,
        u.PasswordHash = i.PasswordHash,
        u.IsActive = i.IsActive,
        u.AvatarPath = i.AvatarPath,
        u.AvatarColorHue = i.AvatarColorHue,
        u.AvatarColorSaturation = i.AvatarColorSaturation,
        u.AvatarColorBrightness = i.AvatarColorBrightness,
        u.CoverPath = i.CoverPath,
        u.LastLoginAt = i.LastLoginAt,
        u.UpdatedAt = ISNULL(i.UpdatedAt, GETDATE())
    FROM dbo.Users u
    INNER JOIN inserted i ON u.UserID = i.UserID;
END;
GO
PRINT N'-- 6.3: Триггер TR_Users_PreventIsSuperAdminChange создан. Изменение IsSuperAdmin заблокировано.';
GO
