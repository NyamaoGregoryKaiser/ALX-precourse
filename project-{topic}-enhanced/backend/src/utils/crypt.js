```javascript
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppError = require('./appError');
const logger = require('./logger');

// Hashing for passwords
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  } catch (err) {
    logger.error('Error hashing password:', err.message);
    throw new AppError('Password hashing failed.', 500, 'PASSWORD_HASH_ERROR');
  }
};

const comparePassword = async (password, hashedPassword) => {
  try {
    return bcrypt.compare(password, hashedPassword);
  } catch (err) {
    logger.error('Error comparing password:', err.message);
    throw new AppError('Password comparison failed.', 500, 'PASSWORD_COMPARE_ERROR');
  }
};

// Encryption for sensitive data (e.g., payment card details)
// IMPORTANT: In a real-world scenario, card data should never hit your server
// directly. Use PCI-compliant tokenization services (Stripe, Braintree, etc.)
// where the card data goes directly to the payment gateway from the client.
// This is for demonstration of encryption principles *if* you had other sensitive PII.

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // Use env variable in prod!
const IV_LENGTH = 16; // For AES, this is always 16

const encrypt = (text) => {
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) { // 32 bytes for aes-256 means 64 hex chars
      logger.error('Invalid ENCRYPTION_KEY for sensitive data. Ensure it is a 32-byte (64-char hex) key.');
      throw new AppError('Server encryption key misconfigured.', 500, 'ENCRYPTION_KEY_ERROR');
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    logger.error('Error encrypting data:', err.message);
    throw new AppError('Data encryption failed.', 500, 'ENCRYPTION_ERROR');
  }
};

const decrypt = (text) => {
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
      logger.error('Invalid ENCRYPTION_KEY for sensitive data. Ensure it is a 32-byte (64-char hex) key.');
      throw new AppError('Server encryption key misconfigured.', 500, 'ENCRYPTION_KEY_ERROR');
    }
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    logger.error('Error decrypting data:', err.message);
    throw new AppError('Data decryption failed.', 500, 'DECRYPTION_ERROR');
  }
};


module.exports = {
  hashPassword,
  comparePassword,
  encrypt,
  decrypt,
};
```