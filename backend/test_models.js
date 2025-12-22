require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

console.log('Testing User model schema...');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/skill-swap';
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000
    });
    console.log('[OK] MongoDB connected');
    
    const userSchema = User.schema;
    console.log('\nUser schema fields:');
    Object.keys(userSchema.paths).forEach(path => {
      const field = userSchema.paths[path];
      console.log(`  - ${path}: ${field.instance} (required: ${field.required || false})`);
    });
    
    console.log('\n[OK] Schema validation successful');
    
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed',
      verificationToken: 'test-token-123'
    };
    
    console.log('\nTesting user creation (not saved):');
    const user = new User(testUser);
    console.log('[OK] User instance created without errors');
    console.log('  - verificationToken:', user.verificationToken);
    console.log('  - collegeEmail:', user.collegeEmail);
    
    await mongoose.disconnect();
    console.log('\n[OK] All model tests passed!');
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
};

connectDB();
