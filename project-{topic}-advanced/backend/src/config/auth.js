module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey', // Use a strong random key in production
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  saltRounds: 10, // For bcrypt hashing
};