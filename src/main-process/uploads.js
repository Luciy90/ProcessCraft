const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Обработчики загрузки файлов
function registerUploadHandlers() {
  ipcMain.handle('upload:cover', async (event, { username, fileData, fileName }) => {
    try {
      // Проверка типа файла
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(fileData.type)) {
        return {
          status: 'error',
          error_code: 'invalid_file_type',
          message: 'Поддерживаются только файлы JPEG и PNG'
        };
      }

      // Создание директории для пользовательских ресурсов, если она не существует
      const userAssetsDir = path.join(__dirname, '../../Server/users', username, 'assets');
      if (!fs.existsSync(userAssetsDir)) {
        try {
          fs.mkdirSync(userAssetsDir, { recursive: true });
        } catch (err) {
          return {
            status: 'error',
            error_code: 'folder_creation_failed',
            message: 'Не удалось создать папку для изображений пользователя'
          };
        }
      }

      // Определение расширения по MIME-типу
      let extension = 'jpg';
      if (fileData.type === 'image/png') {
        extension = 'png';
      } else if (fileData.type === 'image/jpeg' || fileData.type === 'image/jpg') {
        extension = 'jpg';
      }

      // Удаление старых файлов обложек с различными расширениями
      const oldFiles = ['cover.jpg', 'cover.jpeg', 'cover.png'];
      oldFiles.forEach(oldFile => {
        const oldFilePath = path.join(userAssetsDir, oldFile);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Удален старый файл обложки: ${oldFile}`);
          } catch (err) {
            console.warn(`Failed to remove old cover file ${oldFile}:`, err);
          }
        }
      });

      // Создание нового имени файла с фиксированным именем
      const newFileName = `cover.${extension}`;
      const filePath = path.join(userAssetsDir, newFileName);

      // Сохранение файла
      try {
        // Обработка как строки base64, так и буфера данных
        let buffer;
        if (typeof fileData.data === 'string') {
          // Если это строка base64, преобразуем в буфер
          buffer = Buffer.from(fileData.data, 'base64');
        } else if (Buffer.isBuffer(fileData.data)) {
          // Если это уже буфер, используем его напрямую
          buffer = fileData.data;
        } else {
          // Если это массив или другой формат, пытаемся преобразовать
          buffer = Buffer.from(fileData.data);
        }
        
        fs.writeFileSync(filePath, buffer);
      } catch (err) {
        console.error('File save error:', err);
        return {
          status: 'error',
          error_code: 'save_failed',
          message: 'Не удалось сохранить файл'
        };
      }

      // Обновление user.json с новым путем к обложке
      try {
        const userJsonPath = path.join(__dirname, '../../Server/users', username, 'user.json');
        if (fs.existsSync(userJsonPath)) {
          const userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
          userData.coverPath = filePath;
          userData.updatedAt = new Date().toISOString();
          fs.writeFileSync(userJsonPath, JSON.stringify(userData, null, 2));
        }
      } catch (err) {
        console.warn('Failed to update user.json with cover path:', err);
        // Продолжаем, так как файл был успешно сохранен
      }

      return {
        status: 'success',
        type: 'cover',
        file_path: filePath
      };
    } catch (err) {
      console.error('Cover upload error:', err);
      return {
        status: 'error',
        error_code: 'unknown_error',
        message: 'Произошла неизвестная ошибка при загрузке файла'
      };
    }
  });

  ipcMain.handle('upload:avatar', async (event, { username, fileData, fileName }) => {
    try {
      // Проверка типа файла
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(fileData.type)) {
        return {
          status: 'error',
          error_code: 'invalid_file_type',
          message: 'Поддерживаются только файлы JPEG и PNG'
        };
      }

      // Создание директории для пользовательских ресурсов, если она не существует
      const userAssetsDir = path.join(__dirname, '../../Server/users', username, 'assets');
      if (!fs.existsSync(userAssetsDir)) {
        try {
          fs.mkdirSync(userAssetsDir, { recursive: true });
        } catch (err) {
          return {
            status: 'error',
            error_code: 'folder_creation_failed',
            message: 'Не удалось создать папку для аватара пользователя'
          };
        }
      }

      // Определение расширения по MIME-типу
      let extension = 'jpg';
      if (fileData.type === 'image/png') {
        extension = 'png';
      } else if (fileData.type === 'image/jpeg' || fileData.type === 'image/jpg') {
        extension = 'jpg';
      }

      // Удаление старых файлов аватаров с различными расширениями
      const oldFiles = ['avatar.jpg', 'avatar.jpeg', 'avatar.png'];
      oldFiles.forEach(oldFile => {
        const oldFilePath = path.join(userAssetsDir, oldFile);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Удален старый файл аватара: ${oldFile}`);
          } catch (err) {
            console.warn(`Failed to remove old avatar file ${oldFile}:`, err);
          }
        }
      });

      // Создание нового имени файла с фиксированным именем
      const newFileName = `avatar.${extension}`;
      const filePath = path.join(userAssetsDir, newFileName);

      // Сохранение файла
      try {
        // Обработка как строки base64, так и буфера данных
        let buffer;
        if (typeof fileData.data === 'string') {
          // Если это строка base64, преобразуем в буфер
          buffer = Buffer.from(fileData.data, 'base64');
        } else if (Buffer.isBuffer(fileData.data)) {
          // Если это уже буфер, используем его напрямую
          buffer = fileData.data;
        } else {
          // Если это массив или другой формат, пытаемся преобразовать
          buffer = Buffer.from(fileData.data);
        }
        
        fs.writeFileSync(filePath, buffer);
      } catch (err) {
        console.error('File save error:', err);
        return {
          status: 'error',
          error_code: 'save_failed',
          message: 'Не удалось сохранить файл аватара'
        };
      }

      // Обновление user.json с новым путем к аватару
      try {
        const userJsonPath = path.join(__dirname, '../../Server/users', username, 'user.json');
        if (fs.existsSync(userJsonPath)) {
          const userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
          userData.avatarPath = filePath;
          userData.updatedAt = new Date().toISOString();
          fs.writeFileSync(userJsonPath, JSON.stringify(userData, null, 2));
        }
      } catch (err) {
        console.warn('Failed to update user.json:', err);
        // Продолжаем, так как файл был успешно сохранен
      }

      return {
        status: 'success',
        type: 'avatar',
        file_path: filePath
      };
    } catch (err) {
      console.error('Avatar upload error:', err);
      return {
        status: 'error',
        error_code: 'unknown_error',
        message: 'Произошла неизвестная ошибка при загрузке аватара'
      };
    }
  });
}

module.exports = { registerUploadHandlers };