/**
 * Test script for authentication service
 */
const { 
  initializeAuthDatabase, 
  getUserCredentials, 
  verifyUserCredentials, 
  updateUserPassword,
  hashPassword,
  verifyPassword
} = require('./auth-service');

console.log('Testing authentication service...\n');

try {
  // Test password hashing
  console.log('1. Testing password hashing:');
  const password = 'testPassword123';
  const { hash, salt } = hashPassword(password);
  console.log('Password hashed successfully');
  console.log('Hash length:', hash.length);
  console.log('Salt length:', salt.length);
  
  // Test password verification
  console.log('\n2. Testing password verification:');
  const isValid = verifyPassword(password, hash, salt);
  console.log('Password verification result:', isValid ? '✓ PASS' : '✗ FAIL');
  
  const isInvalid = verifyPassword('wrongPassword', hash, salt);
  console.log('Wrong password verification result:', !isInvalid ? '✓ PASS' : '✗ FAIL');
  
  // Initialize auth database
  console.log('\n3. Initializing authentication database:');
  const authDb = initializeAuthDatabase();
  console.log('Authentication database initialized');
  
  // Test getting user credentials
  console.log('\n4. Testing user credentials retrieval:');
  const superAdminCreds = getUserCredentials('AppSuperAdmin');
  console.log('SuperAdmin credentials:', superAdminCreds);
  console.log('Test 4 result:', superAdminCreds ? '✓ PASS' : '✗ FAIL');
  
  const regularUserCreds = getUserCredentials('AppSuperUser');
  console.log('Regular user credentials:', regularUserCreds);
  console.log('Test 5 result:', regularUserCreds ? '✓ PASS' : '✗ FAIL');
  
  // Test user authentication
  console.log('\n5. Testing user authentication:');
  const superAdminAuth = verifyUserCredentials('AppSuperAdmin', 'aA3$!Qp9_superAdminStrongPwd');
  console.log('SuperAdmin authentication:', superAdminAuth ? '✓ PASS' : '✗ FAIL');
  
  const regularUserAuth = verifyUserCredentials('AppSuperUser', 'uU7@#Kx2_superUserStrongPwd');
  console.log('Regular user authentication:', regularUserAuth ? '✓ PASS' : '✗ FAIL');
  
  // Test wrong password
  console.log('\n6. Testing wrong password authentication:');
  const wrongPasswordAuth = verifyUserCredentials('AppSuperAdmin', 'wrongPassword');
  console.log('Wrong password authentication:', !wrongPasswordAuth ? '✓ PASS' : '✗ FAIL');
  
  // Test non-existent user
  console.log('\n7. Testing non-existent user authentication:');
  const nonExistentUserAuth = verifyUserCredentials('NonExistentUser', 'anyPassword');
  console.log('Non-existent user authentication:', !nonExistentUserAuth ? '✓ PASS' : '✗ FAIL');
  
  // Test password update
  console.log('\n8. Testing password update:');
  const updateResult = updateUserPassword('AppSuperUser', 'newPassword123');
  console.log('Password update result:', updateResult ? '✓ PASS' : '✗ FAIL');
  
  // Verify updated password
  console.log('\n9. Testing updated password:');
  const updatedPasswordAuth = verifyUserCredentials('AppSuperUser', 'newPassword123');
  console.log('Updated password authentication:', updatedPasswordAuth ? '✓ PASS' : '✗ FAIL');
  
  console.log('\n---\n');
  console.log('All authentication service tests completed!');
  
} catch (error) {
  console.error('Test failed with error:', error);
}