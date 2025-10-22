/**
 * Script to synchronize user data between database and local storage
 * Ensures that the role displayed in the interface matches the database
 */

const { getUserByUsername } = require('../src/db/request/auth-choice');
const fs = require('fs');
const path = require('path');

async function syncUserData() {
  try {
    console.log('Синхронизация данных пользователя Admin между базой данных и локальным хранилищем...');
    
    // 1. Получаем актуальные данные пользователя из базы данных
    console.log('1. Получение данных пользователя из базы данных...');
    const dbUser = await getUserByUsername('Admin', 'superadmin');
    
    if (!dbUser) {
      console.error('❌ Пользователь Admin не найден в базе данных');
      return;
    }
    
    console.log('   ✓ Данные пользователя получены из базы данных');
    console.log('   - DisplayName:', dbUser.displayName);
    console.log('   - IsSuperAdmin:', dbUser.isSuperAdmin);
    console.log('   - Roles:', dbUser.roles);
    
    // 2. Читаем локальные данные пользователя
    console.log('2. Чтение локальных данных пользователя...');
    const userFilePath = path.join(__dirname, '..', 'Server', 'users', 'Admin', 'user.json');
    
    if (!fs.existsSync(userFilePath)) {
      console.error('❌ Файл user.json не найден');
      return;
    }
    
    const localUser = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
    console.log('   ✓ Локальные данные пользователя прочитаны');
    console.log('   - DisplayName:', localUser.displayName);
    console.log('   - Role:', localUser.role);
    
    // 3. Синхронизируем данные
    console.log('3. Синхронизация данных...');
    let updated = false;
    
    // Обновляем displayName если он отличается
    if (localUser.displayName !== dbUser.displayName) {
      localUser.displayName = dbUser.displayName;
      console.log('   ✓ DisplayName обновлен с', localUser.displayName, 'на', dbUser.displayName);
      updated = true;
    }
    
    // Обновляем роль если она отличается
    const correctRole = dbUser.isSuperAdmin ? 'SuperAdmin' : (dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles[0] : 'User');
    if (localUser.role !== correctRole) {
      localUser.role = correctRole;
      console.log('   ✓ Role обновлена с', localUser.role, 'на', correctRole);
      updated = true;
    }
    
    // Обновляем флаг isSuperAdmin если он есть в локальных данных
    if (localUser.isSuperAdmin !== undefined && localUser.isSuperAdmin !== dbUser.isSuperAdmin) {
      localUser.isSuperAdmin = dbUser.isSuperAdmin;
      console.log('   ✓ isSuperAdmin обновлен с', localUser.isSuperAdmin, 'на', dbUser.isSuperAdmin);
      updated = true;
    }
    
    // 4. Сохраняем обновленные данные
    if (updated) {
      fs.writeFileSync(userFilePath, JSON.stringify(localUser, null, 2), 'utf8');
      console.log('   ✓ Локальные данные пользователя обновлены');
    } else {
      console.log('   ℹ Локальные данные уже соответствуют данным из базы данных');
    }
    
    // 5. Проверяем localStorage (если он существует)
    console.log('4. Проверка localStorage...');
    const localStoragePath = path.join(__dirname, '..', 'localStorage.json');
    if (fs.existsSync(localStoragePath)) {
      try {
        const localStorageData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
        const SESSION_KEY = 'pc_current_user';
        
        if (localStorageData[SESSION_KEY]) {
          const storedUser = JSON.parse(localStorageData[SESSION_KEY]);
          console.log('   ✓ Найдены данные пользователя в localStorage');
          console.log('   - DisplayName:', storedUser.displayName);
          console.log('   - Role:', storedUser.role);
          
          // Обновляем данные в localStorage если они отличаются
          let localStorageUpdated = false;
          
          if (storedUser.displayName !== dbUser.displayName) {
            storedUser.displayName = dbUser.displayName;
            console.log('   ✓ DisplayName в localStorage обновлен');
            localStorageUpdated = true;
          }
          
          if (storedUser.role !== correctRole) {
            storedUser.role = correctRole;
            console.log('   ✓ Role в localStorage обновлена');
            localStorageUpdated = true;
          }
          
          if (localStorageUpdated) {
            localStorageData[SESSION_KEY] = JSON.stringify(storedUser);
            fs.writeFileSync(localStoragePath, JSON.stringify(localStorageData, null, 2), 'utf8');
            console.log('   ✓ Данные в localStorage обновлены');
          } else {
            console.log('   ℹ Данные в localStorage уже актуальны');
          }
        } else {
          console.log('   ℹ Данные пользователя в localStorage отсутствуют');
        }
      } catch (error) {
        console.warn('   ⚠ Ошибка при работе с localStorage:', error.message);
      }
    } else {
      console.log('   ℹ Файл localStorage.json не найден');
    }
    
    console.log('\n✅ Синхронизация завершена успешно!');
    console.log('\nРекомендуемые действия:');
    console.log('1. Перезапустите приложение ProcessCraft');
    console.log('2. Войдите в систему заново под пользователем Admin');
    console.log('3. Проверьте, что роль теперь отображается как "SuperAdmin"');
    
  } catch (error) {
    console.error('❌ Ошибка при синхронизации данных пользователя:', error.message);
  }
}

// Запуск функции
syncUserData();