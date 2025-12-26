require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const connectDB = require('../config/db');

async function createAdmin() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const adminData = {
      name: 'Admin User',
      email: 'admin@skillsync.test',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
      points: 100
    };

    const existing = await User.findOne({ email: adminData.email });
    
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log('✅ Updated existing user to admin:', adminData.email);
      console.log('Password: Admin@123');
    } else {
      const admin = await User.create(adminData);
      console.log('✅ Admin user created:', admin.email);
      console.log('Password: Admin@123');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
