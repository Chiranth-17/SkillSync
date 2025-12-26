const http = require('http');

// Test backend
const testBackend = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET',
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✓ Backend running at http://localhost:5000');
      console.log('  Response:', data.substring(0, 50));
    });
  });

  req.on('error', (err) => {
    console.log('✗ Backend error:', err.message);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log('✗ Backend timeout');
  });

  req.end();
};

// Test frontend
const testFrontend = () => {
  const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/',
    method: 'GET',
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✓ Frontend running at http://localhost:5173');
    });
  });

  req.on('error', (err) => {
    console.log('✗ Frontend error:', err.message);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log('✗ Frontend timeout');
  });

  req.end();
};

console.log('Testing servers...\n');
setTimeout(() => testBackend(), 500);
setTimeout(() => testFrontend(), 1000);
setTimeout(() => process.exit(0), 5000);
