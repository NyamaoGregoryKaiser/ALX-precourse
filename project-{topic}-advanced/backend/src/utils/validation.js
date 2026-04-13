// Basic validation utilities (can be expanded with Joi or Zod)
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

exports.isValidPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number, one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

exports.isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

exports.isValidCssSelector = (selector) => {
  // This is a very basic check. A robust check would require parsing.
  // For now, ensure it's a non-empty string.
  return typeof selector === 'string' && selector.trim().length > 0;
};