# File Upload Implementation for ProcessCraft

## Overview
This document describes the implementation of file upload functionality for background images and user avatars in the ProcessCraft application.

## Implementation Checklist

### 1. Main Process (Electron) Handlers ✅
- Added `upload:cover` IPC handler in `src/main.js`
- Added `upload:avatar` IPC handler in `src/main.js`
- Implemented file validation (JPEG/PNG only)
- **UPDATED**: All files now saved to `Server/users/{username}/assets/` directory
- File saving with unique timestamps
- Automatic `user.json` updates for avatar paths

### 2. Renderer Process Integration ✅
- Added `uploadCover` and `uploadAvatar` methods to `UserStore` utility
- Updated `ProfileModule` to handle file input events
- Implemented file type validation on client side
- Base64 encoding for file transfer via IPC

### 3. UI Event Handling ✅
- Cover image upload: `<input id="coverInput">` triggers on change
- Avatar upload: `<input id="avatarInput">` triggers on change
- Real-time UI updates after successful uploads
- Error handling with user notifications

### 4. File Storage Structure ✅
```
Server/
└── users/
    └── {username}/
        ├── assets/                 # All user images (avatars + covers)
        │   ├── avatar_1234567890.jpg
        │   ├── cover_1234567891.jpg
        │   └── cover_1234567892.png
        └── user.json              # Updated with avatarPath
```

## Key Features

### File Validation
- **Supported formats**: JPEG (.jpg, .jpeg), PNG (.png)
- **MIME type checking**: Validates both extension and MIME type
- **Size handling**: Base64 encoding for transfer via IPC

### Directory Management
- **Automatic creation**: Creates missing directories recursively
- **Unique naming**: Timestamp-based filenames prevent conflicts
- **Unified structure**: All user images stored in single `assets` folder per user

### Error Handling
- **Comprehensive error codes**: `invalid_file_type`, `folder_creation_failed`, `save_failed`, `unknown_error`
- **User feedback**: Clear error messages displayed via notification system
- **Graceful degradation**: Continues operation even if `user.json` update fails

### UI Updates
- **Real-time updates**: Cover and avatar images update immediately after upload
- **Cross-component sync**: Avatar updates in profile, top bar, and user store
- **Fallback handling**: Maintains fallback avatars when needed

## Usage Flow

### Cover Image Upload
1. User clicks "Изменить фон" button
2. File picker opens for image selection
3. File validated (type, format)
4. **UPDATED**: Saved to `Server/users/{username}/assets/` with unique name
5. Cover image updates in profile view
6. Success notification displayed

### Avatar Upload
1. User clicks upload icon on avatar
2. File picker opens for image selection
3. File validated (type, format)
4. **UPDATED**: Saved to `Server/users/{username}/assets/` with unique name
5. Avatar updates in profile, top bar, and user store
6. `user.json` updated with new `avatarPath`
7. Success notification displayed

## Technical Details

### IPC Communication
```javascript
// Main process handlers
ipcMain.handle('upload:cover', async (event, { username, fileData, fileName }) => { ... })
ipcMain.handle('upload:avatar', async (event, { username, fileData, fileName }) => { ... })

// Renderer process calls
window.UserStore.uploadCover(username, fileData)
window.UserStore.uploadAvatar(username, fileData)
```

### File Processing
- **Base64 encoding**: Files converted to base64 for IPC transfer
- **Buffer conversion**: Base64 data converted back to Buffer in main process
- **Enhanced data handling**: Supports multiple data formats (string, Buffer, array)
- **Synchronous writes**: `fs.writeFileSync` for immediate file saving

### Error Response Format
```json
{
  "status": "error",
  "error_code": "invalid_file_type",
  "message": "Поддерживаются только файлы JPEG и PNG"
}
```

### Success Response Format
```json
{
  "status": "success",
  "type": "avatar",
  "file_path": "/path/to/saved/file.jpg"
}
```

## Security Considerations

### File Type Validation
- **Extension checking**: Validates file extensions
- **MIME type validation**: Double-checks file content type
- **Whitelist approach**: Only allows specific image formats

### Path Security
- **Directory traversal prevention**: Uses `path.join` for safe path construction
- **Contained storage**: Files saved only in designated user assets directories
- **User isolation**: Each user's files stored in separate folders

## Recent Updates

### Path Consolidation ✅
- **Removed**: `Server/user/` directory (was used for cover images)
- **Consolidated**: All user images now stored in `Server/users/{username}/assets/`
- **Benefits**: Cleaner structure, easier backup, better organization

### Enhanced File Handling ✅
- **Improved**: Better handling of different data formats
- **Fixed**: Base64 to Buffer conversion issues
- **Added**: Comprehensive error logging for debugging

### Cache-Busting Implementation ✅
- **Added**: Timestamp-based cache-busting for immediate UI updates
- **Fallback**: Graceful degradation when cache-busting fails
- **Performance**: Optimized timing for file system operations

## Testing

### Manual Testing Steps
1. Open profile page as authenticated user
2. Click "Изменить фон" and select JPEG/PNG image
3. Verify cover image updates
4. Click avatar upload icon and select JPEG/PNG image
5. Verify avatar updates in profile and top bar
6. Check file creation in `Server/users/{username}/assets/` directory
7. Verify `user.json` updates for avatar path
8. **NEW**: Confirm no `Server/user/` directory exists

### Error Testing
1. Try uploading non-image files (should show error)
2. Try uploading unsupported formats (should show error)
3. Verify error messages are displayed correctly

## Future Enhancements

### Potential Improvements
- **File size limits**: Add maximum file size restrictions
- **Image compression**: Automatic resizing for large images
- **Thumbnail generation**: Create smaller versions for UI
- **Drag & drop**: Support for drag-and-drop file uploads
- **Batch uploads**: Multiple file upload support
- **Progress indicators**: Upload progress bars

### Performance Optimizations
- **Async file operations**: Convert to async file operations
- **Streaming uploads**: Handle large files more efficiently
- **Caching**: Implement image caching for better performance