const http = require('http');
console.log('Starting basic server test...');

// Test if we can start a simple server
const testServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200);
    res.end('Test OK');
  }
});

testServer.listen(9999, () => {
  console.log('Test server started on port 9999');
  
  // Now test if backend dependencies load
  try {
    const express = require('express');
    console.log('✓ Express loaded');
    
    const mongoose = require('mongoose');
    console.log('✓ Mongoose loaded');
    
    const dotenv = require('dotenv');
    console.log('✓ dotenv loaded');
    
    const cors = require('cors');
    console.log('✓ cors loaded');
    
    const passport = require('passport');
    console.log('✓ passport loaded');
    
    console.log('\nAll dependencies loaded successfully!');
  } catch (err) {
    console.error('Dependency error:', err.message);
  }
  
  testServer.close();
  process.exit(0);
});

setTimeout(() => {
  console.error('Test timeout');
  process.exit(1);
}, 5000);
