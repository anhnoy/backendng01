const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a 6-digit numeric access code
 * @returns {string} 6-digit code (e.g., "123456")
 */
function generateAccessCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate JWT token for quotation access
 * @param {number} quotationId - The quotation ID
 * @param {string} accessCode - The access code
 * @returns {string} JWT token
 */
function generateQuotationToken(quotationId, accessCode) {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret';
  return jwt.sign(
    { 
      quotationId, 
      accessCode,
      type: 'quotation-access' 
    },
    secret,
    { expiresIn: '7d' } // Token valid for 7 days
  );
}

/**
 * Verify JWT token for quotation access
 * @param {string} token - The JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
function verifyQuotationToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    const decoded = jwt.verify(token, secret);
    if (decoded.type === 'quotation-access') {
      return decoded;
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessCode,
  generateQuotationToken,
  verifyQuotationToken
};
