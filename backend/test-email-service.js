const emailService = require('./services/emailService');
const exports = Object.keys(emailService);
console.log('✅ Email service exports:', exports);
console.log('✅ Has sendRVVerificationOTP:', exports.includes('sendRVVerificationOTP'));
