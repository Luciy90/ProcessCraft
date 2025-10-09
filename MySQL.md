-- *** Скрипт для создания базы данный и пользователя для входа ***

-- Имя Логина и Пароль
DECLARE @LoginName sysname = N'ProcessCraft';
DECLARE @Password nvarchar(128) = N'ProcessCraftPassword';
DECLARE @DBName sysname = N'ProcessCraftDB';
DECLARE @DataPath nvarchar(500) = N'C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA'; -- !!! ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ ЭТОТ ПУТЬ !!!

--------------------------------------------------------------------------------------
-- 1. Создание Логина на уровне сервера
--------------------------------------------------------------------------------------

IF EXISTS (SELECT * FROM sys.server_principals WHERE name = @LoginName)
BEGIN
    DROP LOGIN ProcessCraft;
END
GO

-- Создаем Логин. Значения вставляем напрямую, поскольку они нужны после GO
CREATE LOGIN ProcessCraft
    WITH PASSWORD = N'ProcessCraftPassword',
    CHECK_POLICY = ON,
    CHECK_EXPIRATION = OFF;
GO

--------------------------------------------------------------------------------------
-- 2. Создание Базы данных
--------------------------------------------------------------------------------------

-- Для этой части нужно убедиться, что база не существует, и создать ее
IF EXISTS (SELECT * FROM sys.databases WHERE name = N'ProcessCraftDB')
BEGIN
    ALTER DATABASE ProcessCraftDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ProcessCraftDB;
END
GO

-- Создаем Базу данных.
-- !!! ОБЯЗАТЕЛЬНО ПРОВЕРЬТЕ И ИЗМЕНИТЕ ПУТИ FILENAME !!!
CREATE DATABASE ProcessCraftDB
ON
( NAME = ProcessCraftDB_Data,
    FILENAME = 'C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\ProcessCraftDB_Data.mdf', -- ПРОВЕРЬТЕ ПУТЬ
    SIZE = 10MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 5MB )
LOG ON
( NAME = ProcessCraftDB_Log,
    FILENAME = 'C:\Program Files\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA\ProcessCraftDB_Log.ldf',  -- ПРОВЕРЬТЕ ПУТЬ
    SIZE = 5MB,
    MAXSIZE = 25MB,
    FILEGROWTH = 5MB );
GO

--------------------------------------------------------------------------------------
-- 3. Назначение владельца Базы данных
--------------------------------------------------------------------------------------

-- Логин ProcessCraft становится Владельцем Базы Данных (DBO) и получает полный контроль
ALTER AUTHORIZATION ON DATABASE::ProcessCraftDB TO ProcessCraft;
GO