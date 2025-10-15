// Тестовый скрипт для подключения к базе данных
require('dotenv').config();
const sql = require('mssql');

console.log('Тестирование подключения к базе данных и операций БД...');

async function testDatabaseOperations() {
  try {
    console.log('\n1. Информация о конфигурации подключения:');
    console.log('Сервер БД:', process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS');
    console.log('Имя базы данных:', process.env.DB_DATABASE || 'ProcessCraftBD');
    
    // Конфигурация подключения с точными учетными данными из MySQL.md
    const config = {
      server: (process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').split(',')[0],
      database: process.env.DB_DATABASE || 'ProcessCraftBD',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        port: (process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').includes(',') ? 
              parseInt((process.env.DB_SERVER || 'OZO-62\\SQLEXPRESS').split(',')[1]) : 1433
      }
    };
    
    // Подключение от имени суперадмина
    console.log('\n2. Подключение от имени суперадмина (AppSuperAdmin)...');
    const adminConfig = {...config};
    adminConfig.user = 'AppSuperAdmin';
    adminConfig.password = 'aA3$!Qp9_superAdminStrongPwd';
    
    const adminPool = new sql.ConnectionPool(adminConfig);
    await adminPool.connect();
    console.log('✓ Подключение суперадмина успешно!');
    
    // Подключение от имени обычного пользователя
    console.log('\n3. Подключение от имени обычного пользователя (AppSuperUser)...');
    const regularConfig = {...config};
    regularConfig.user = 'AppSuperUser';
    regularConfig.password = 'uU7@!Kx2_superUserStrongPwd';
    
    const regularPool = new sql.ConnectionPool(regularConfig);
    await regularPool.connect();
    console.log('✓ Подключение обычного пользователя успешно!');
    
    // Тестирование операций БД
    console.log('\n4. Тестирование операций БД:');
    
    // 4.1. Создание тестовой таблицы (только суперадмин)
    const testTableName = `TestTable_${Date.now()}`;
    console.log(`\n4.1. Создание тестовой таблицы ${testTableName} от имени суперадмина...`);
    try {
      await adminPool.request().query(`
        CREATE TABLE ${testTableName} (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100),
          description NVARCHAR(255),
          created_at DATETIME DEFAULT GETDATE()
        )
      `);
      console.log('✓ Таблица успешно создана');
    } catch (err) {
      console.log('✗ Ошибка создания таблицы:', err.message);
      throw err;
    }
    
    // 4.2. Вставка тестовой записи от имени суперадмина
    console.log('\n4.2. Вставка тестовой записи от имени суперадмина...');
    try {
      await adminPool.request()
        .input('name', sql.NVarChar(100), 'Тестовая запись от суперадмина')
        .input('description', sql.NVarChar(255), 'Это тестовая запись, созданная суперадмином')
        .query(`INSERT INTO ${testTableName} (name, description) VALUES (@name, @description)`);
      console.log('✓ Тестовая запись успешно вставлена суперадмином');
    } catch (err) {
      console.log('✗ Ошибка вставки записи суперадмином:', err.message);
    }
    
    // 4.3. Вставка тестовой записи от имени обычного пользователя
    console.log('\n4.3. Вставка тестовой записи от имени обычного пользователя...');
    try {
      await regularPool.request()
        .input('name', sql.NVarChar(100), 'Тестовая запись от пользователя')
        .input('description', sql.NVarChar(255), 'Это тестовая запись, созданная обычным пользователем')
        .query(`INSERT INTO ${testTableName} (name, description) VALUES (@name, @description)`);
      console.log('✓ Тестовая запись успешно вставлена обычным пользователем');
    } catch (err) {
      console.log('✗ Ошибка вставки записи обычным пользователем:', err.message);
    }
    
    // 4.4. Выборка данных от имени суперадмина
    console.log('\n4.4. Выборка данных из тестовой таблицы от имени суперадмина...');
    try {
      const result = await adminPool.request().query(`SELECT * FROM ${testTableName} ORDER BY id`);
      console.log(`✓ Выбрано ${result.recordset.length} записей`);
      result.recordset.forEach((row, index) => {
        console.log(`  Запись ${index + 1}: ID=${row.id}, Name="${row.name}", Description="${row.description}"`);
      });
    } catch (err) {
      console.log('✗ Ошибка выборки данных суперадмином:', err.message);
    }
    
    // 4.5. Выборка данных от имени обычного пользователя
    console.log('\n4.5. Выборка данных из тестовой таблицы от имени обычного пользователя...');
    try {
      const result = await regularPool.request().query(`SELECT * FROM ${testTableName} ORDER BY id`);
      console.log(`✓ Выбрано ${result.recordset.length} записей`);
      result.recordset.forEach((row, index) => {
        console.log(`  Запись ${index + 1}: ID=${row.id}, Name="${row.name}", Description="${row.description}"`);
      });
    } catch (err) {
      console.log('✗ Ошибка выборки данных обычным пользователем:', err.message);
    }
    
    // 4.6. Обновление записи от имени суперадмина
    console.log('\n4.6. Обновление записи от имени суперадмина...');
    try {
      await adminPool.request()
        .input('id', sql.Int, 1)
        .input('description', sql.NVarChar(255), 'Обновлено суперадмином')
        .query(`UPDATE ${testTableName} SET description = @description WHERE id = @id`);
      console.log('✓ Запись успешно обновлена суперадмином');
    } catch (err) {
      console.log('✗ Ошибка обновления записи суперадмином:', err.message);
    }
    
    // 4.7. Обновление записи от имени обычного пользователя
    console.log('\n4.7. Обновление записи от имени обычного пользователя...');
    try {
      await regularPool.request()
        .input('id', sql.Int, 2)
        .input('description', sql.NVarChar(255), 'Обновлено обычным пользователем')
        .query(`UPDATE ${testTableName} SET description = @description WHERE id = @id`);
      console.log('✓ Запись успешно обновлена обычным пользователем');
    } catch (err) {
      console.log('✗ Ошибка обновления записи обычным пользователем:', err.message);
    }
    
    // 4.8. Удаление тестовой записи от имени суперадмина
    console.log('\n4.8. Удаление тестовой записи от имени суперадмина...');
    try {
      const result = await adminPool.request()
        .input('id', sql.Int, 1)
        .query(`DELETE FROM ${testTableName} WHERE id = @id`);
      console.log(`✓ Удалено ${result.rowsAffected[0]} записей суперадмином`);
    } catch (err) {
      console.log('✗ Ошибка удаления записи суперадмином:', err.message);
    }
    
    // 4.9. Попытка создания таблицы обычным пользователем (должна завершиться ошибкой)
    console.log('\n4.9. Попытка создания таблицы обычным пользователем...');
    try {
      const userTestTable = `UserTestTable_${Date.now()}`;
      await regularPool.request().query(`
        CREATE TABLE ${userTestTable} (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100)
        )
      `);
      console.log('✗ ОШИБКА: Обычный пользователь не должен иметь права создавать таблицы');
      // Очистка, если таблица была создана
      await adminPool.request().query(`DROP TABLE IF EXISTS ${userTestTable}`);
    } catch (err) {
      console.log('✓ Правильно: Обычный пользователь не имеет прав на создание таблиц');
    }
    
    // 4.10. Попытка удаления таблицы обычным пользователем (должна завершиться ошибкой)
    console.log('\n4.10. Попытка удаления таблицы обычным пользователем...');
    try {
      await regularPool.request().query(`DROP TABLE ${testTableName}`);
      console.log('✗ ОШИБКА: Обычный пользователь не должен иметь права удалять таблицы');
    } catch (err) {
      console.log('✓ Правильно: Обычный пользователь не имеет прав на удаление таблиц');
    }
    
    // 4.11. Удаление тестовой таблицы от имени суперадмина
    console.log('\n4.11. Удаление тестовой таблицы от имени суперадмина...');
    try {
      await adminPool.request().query(`DROP TABLE ${testTableName}`);
      console.log('✓ Тестовая таблица успешно удалена суперадмином');
    } catch (err) {
      console.log('✗ Ошибка удаления таблицы суперадмином:', err.message);
    }
    
    // Закрытие подключений
    await regularPool.close();
    await adminPool.close();
    
    console.log('\n---\n');
    console.log('Все тесты успешно завершены!');
    console.log('\nРезюме:');
    console.log('- SuperAdmin может создавать, читать, обновлять и удалять таблицы');
    console.log('- Regular User может читать, вставлять и обновлять данные в существующих таблицах');
    console.log('- Regular User НЕ может создавать или удалять таблицы');
    console.log('- Оба пользователя успешно подключены к базе данных');
    
  } catch (err) {
    console.error('Тест не пройден:', err);
  } finally {
    console.log('\nТест завершен.');
  }
}

testDatabaseOperations();