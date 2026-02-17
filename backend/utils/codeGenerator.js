const crypto = require('crypto');

/**
 * Generate a random alphanumeric code
 * @param {number} length - Length of the code
 * @param {boolean} uppercase - Whether to use uppercase letters
 * @returns {string} - Generated code
 */
const generateCode = (length = 8, uppercase = true) => {
  const characters = uppercase 
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    : 'abcdefghijklmnopqrstuvwxyz0123456789';
  
  let code = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    code += characters[randomBytes[i] % characters.length];
  }
  
  return code;
};

/**
 * Generate a readable code with format XXXX-XXXX
 * @returns {string} - Formatted code
 */
const generateReadableCode = () => {
  const part1 = generateCode(4);
  const part2 = generateCode(4);
  return `${part1}-${part2}`;
};

/**
 * Generate an invite token (longer, more secure)
 * @returns {string} - Invite token
 */
const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Validate code format
 * @param {string} code - Code to validate
 * @returns {boolean} - Is valid
 */
const validateCodeFormat = (code) => {
  // 8 alphanumeric characters
  const pattern = /^[A-Z0-9]{8}$/;
  return pattern.test(code.toUpperCase());
};

module.exports = {
  generateCode,
  generateReadableCode,
  generateInviteToken,
  validateCodeFormat
};