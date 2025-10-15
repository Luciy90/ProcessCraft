/**
 * Authentication service for handling password hashing and verification
 * This service removes plaintext passwords from the application and uses only password hashes
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Path to the authentication database
const AUTH_DB_FILE = path.join(__dirname, 'auth-db.json');

/**
 * Hash a password using PBKDF2
 * @param {string} password - The password to hash
 * @param {string} salt - The salt to use (optional, will be generated if not provided)
 * @returns {Object} - Object containing the hash and salt
 */
function hashPassword(password, salt = null) {
  // Generate a salt if not provided
  if (!salt) {
    salt = crypto.randomBytes(32).toString('hex');
  }
  
  // Hash the password using PBKDF2
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash,
    salt
  };
}

/**
 * Verify a password against a hash
 * @param {string} password - The password to verify
 * @param {string} hash - The hash to compare against
 * @param {string} salt - The salt used to create the hash
 * @returns {boolean} - Whether the password matches the hash
 */
function verifyPassword(password, hash, salt) {
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hashedPassword === hash;
}

/**
 * Initialize the authentication database with our users
 */
function initializeAuthDatabase() {
  // Hash the passwords for our users
  const superAdmin = {
    username: 'AppSuperAdmin',
    ...hashPassword('aA3$!Qp9_superAdminStrongPwd')
  };
  
  const regularUser = {
    username: 'AppSuperUser',
    ...hashPassword('uU7@#Kx2_superUserStrongPwd')
  };
  
  // Create the authentication database
  const authDb = {
    users: {
      'AppSuperAdmin': superAdmin,
      'AppSuperUser': regularUser
    },
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  // Save to file
  fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(authDb, null, 2));
  console.log('Authentication database initialized with hashed passwords');
  
  return authDb;
}

/**
 * Get user credentials (username only, no password)
 * @param {string} username - The username to look up
 * @returns {Object|null} - User object with username only, or null if not found
 */
function getUserCredentials(username) {
  try {
    // Check if auth database exists
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('Authentication database not found, initializing...');
      initializeAuthDatabase();
    }
    
    // Read and parse the auth database
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Return user object (without password hash for security)
    const user = authDb.users[username];
    if (!user) {
      return null;
    }
    
    // Return only the username (no password hash)
    return {
      username: user.username
    };
  } catch (error) {
    console.error('Failed to get user credentials:', error);
    return null;
  }
}

/**
 * Verify user credentials
 * @param {string} username - The username to verify
 * @param {string} password - The password to verify
 * @returns {boolean} - Whether the credentials are valid
 */
function verifyUserCredentials(username, password) {
  try {
    // Check if auth database exists
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('Authentication database not found, initializing...');
      initializeAuthDatabase();
    }
    
    // Read and parse the auth database
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Get user
    const user = authDb.users[username];
    if (!user) {
      console.log(`User ${username} not found in auth database`);
      return false;
    }
    
    // Verify password
    const isValid = verifyPassword(password, user.hash, user.salt);
    console.log(`Password verification for ${username}: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  } catch (error) {
    console.error('Failed to verify user credentials:', error);
    return false;
  }
}

/**
 * Update user password
 * @param {string} username - The username to update
 * @param {string} newPassword - The new password
 * @returns {boolean} - Whether the update was successful
 */
function updateUserPassword(username, newPassword) {
  try {
    // Check if auth database exists
    if (!fs.existsSync(AUTH_DB_FILE)) {
      console.log('Authentication database not found, initializing...');
      initializeAuthDatabase();
    }
    
    // Read and parse the auth database
    const authData = fs.readFileSync(AUTH_DB_FILE, 'utf8');
    const authDb = JSON.parse(authData);
    
    // Check if user exists
    if (!authDb.users[username]) {
      console.error(`User ${username} not found`);
      return false;
    }
    
    // Hash the new password
    const { hash, salt } = hashPassword(newPassword);
    
    // Update user
    authDb.users[username].hash = hash;
    authDb.users[username].salt = salt;
    authDb.lastUpdated = new Date().toISOString();
    
    // Save to file
    fs.writeFileSync(AUTH_DB_FILE, JSON.stringify(authDb, null, 2));
    console.log(`Password updated for user ${username}`);
    
    return true;
  } catch (error) {
    console.error('Failed to update user password:', error);
    return false;
  }
}

// Initialize the auth database when the module is loaded
// This ensures we have the correct passwords
initializeAuthDatabase();

module.exports = {
  hashPassword,
  verifyPassword,
  initializeAuthDatabase,
  getUserCredentials,
  verifyUserCredentials,
  updateUserPassword
};