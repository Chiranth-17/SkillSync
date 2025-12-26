require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const RVVerification = require('../models/RVVerification');
const connectDB = require('../config/db');

async function checkStatus(email) {
  try {
    await connectDB(process.env.MONGO_URI);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      process.exit(1);
    }

    const verification = await RVVerification.findOne({ userId: user._id });
    
    console.log('\n📋 Verification Status Report');
    console.log('═'.repeat(50));
    console.log('User:', user.name, `(${user.email})`);
    console.log('User Role:', user.role || 'user');
    console.log('User ID:', user._id);
    
    if (!verification) {
      console.log('\nRV Verification Status: none (not started)');
    } else {
      console.log('\nRV Verification Status:', verification.status);
      console.log('RV Email:', verification.rvEmail);
      console.log('RV Login ID:', verification.rvLoginId || 'N/A');
      console.log('Email Verified:', verification.emailVerified);
      console.log('ID Card Image:', verification.idCardImageUrl);
      
      if (verification.verifiedAt) {
        console.log('Verified At:', verification.verifiedAt.toISOString());
      }
      if (verification.rejectedAt) {
        console.log('Rejected At:', verification.rejectedAt.toISOString());
      }
      if (verification.notes) {
        console.log('Admin Notes:', verification.notes);
      }
    }
    
    console.log('═'.repeat(50));
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node checkVerificationStatus.js <email>');
  console.log('Example: node checkVerificationStatus.js user@example.com');
  process.exit(1);
}

checkStatus(email);
