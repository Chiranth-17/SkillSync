/**
 * Authentication System Test Script
 * Tests all login and signup related fixes
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

// Test configuration
const testUser = {
  name: 'TestUser' + Date.now(),
  email: `test${Date.now()}@example.com`,
  password: 'testpassword123'
};

async function testEndpoint(name, method, endpoint, body = null, headers = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);

    if (response.ok) {
      console.log(`   ✅ ${name} - PASSED`);
      return { success: true, data, cookies: response.headers.get('set-cookie') };
    } else {
      console.log(`   ❌ ${name} - FAILED`);
      return { success: false, data };
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAuthTests() {
  console.log('🚀 Starting Authentication System Tests');
  console.log('=====================================');

  // Test 1: Health Check
  await testEndpoint('Health Check', 'GET', '/');

  // Test 2: Register New User
  const registerResult = await testEndpoint('User Registration', 'POST', '/auth/register', testUser);

  if (registerResult.success) {
    console.log('\n📝 Registration successful, testing login...');

    // Test 3: Login with valid credentials
    const loginResult = await testEndpoint('User Login', 'POST', '/auth/login', {
      username: testUser.email,
      password: testUser.password
    });

    if (loginResult.success && loginResult.cookies) {
      console.log('\n🔐 Login successful, testing protected routes...');

      // Extract cookies for authenticated requests
      const cookies = loginResult.cookies;
      const authHeaders = { 'Cookie': cookies };

      // Test 4: Get current user (protected route)
      await testEndpoint('Get Current User', 'GET', '/auth/me', null, authHeaders);

      // Test 5: Test refresh token
      await testEndpoint('Refresh Token', 'POST', '/auth/refresh', null, authHeaders);

      // Test 6: Test logout
      await testEndpoint('Logout', 'POST', '/auth/logout', null, authHeaders);
    }

    // Test 7: Try to register same user again (should fail)
    await testEndpoint('Duplicate Registration', 'POST', '/auth/register', testUser);

    // Test 8: Login with wrong password (should fail)
    await testEndpoint('Invalid Login', 'POST', '/auth/login', {
      username: testUser.email,
      password: 'wrongpassword'
    });
  }

  // Test 9: Test validation errors
  await testEndpoint('Empty Registration', 'POST', '/auth/register', {});
  await testEndpoint('Empty Login', 'POST', '/auth/login', {});

  console.log('\n🏁 Authentication Tests Complete');
  console.log('=====================================');
}

// Check if server is running before running tests
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: cd backend && npm start');
    return false;
  }
}

// Run tests if server is available
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAuthTests();
  }
}

main().catch(console.error);
