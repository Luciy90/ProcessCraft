const { getUserByUsername } = require('../src/db/request/auth-choice');

async function checkUserRole() {
  try {
    console.log('Проверка роли пользователя Admin...');
    
    // Получаем данные пользователя Admin из базы данных
    const userData = await getUserByUsername('Admin', 'superadmin');
    
    if (!userData) {
      console.log('Пользователь Admin не найден в базе данных');
      return;
    }
    
    console.log('Данные пользователя Admin из базы данных:');
    console.log('- DisplayName:', userData.displayName);
    console.log('- UserName:', userData.username);
    console.log('- IsSuperAdmin:', userData.isSuperAdmin);
    console.log('- Roles:', userData.roles);
    console.log('- All data:', JSON.stringify(userData, null, 2));
    
    // Определяем роль, которая должна отображаться
    let displayedRole = 'User';
    if (userData.isSuperAdmin) {
      displayedRole = 'SuperAdmin';
    } else if (userData.roles && userData.roles.length > 0) {
      displayedRole = userData.roles[0];
    }
    
    console.log('\nОпределяемая роль для отображения:', displayedRole);
    
  } catch (error) {
    console.error('Ошибка при проверке роли пользователя:', error);
  }
}

// Запуск функции
checkUserRole();