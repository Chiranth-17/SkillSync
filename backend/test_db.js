require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('MONGO_URI:', process.env.MONGO_URI || 'NOT SET');

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI;
  const allowLocal = process.env.ALLOW_LOCAL_MONGO === 'true';
  const localFallback = 'mongodb://localhost:27017/skill-swap';
  
  const finalUri = mongoUri || (allowLocal ? localFallback : null);
  
  if (!finalUri) {
    console.error('✗ MongoDB URI not configured');
    return false;
  }
  
  try {
    await mongoose.connect(finalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000
    });
    console.log('✓ MongoDB connection successful');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    return false;
  }
};

connectDB().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
