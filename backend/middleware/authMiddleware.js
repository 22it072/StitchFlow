// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CompanyUser = require('../models/CompanyUser');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Optional: Get company context from header (for non-company routes that might need it)
const getCompanyContext = async (req, res, next) => {
  try {
    const companyId = req.headers['x-company-id'];
    
    if (companyId && req.user) {
      const membership = await CompanyUser.findOne({
        user: req.user._id,
        company: companyId,
        isActive: true
      });
      
      if (membership) {
        req.companyId = companyId;
        req.userRole = membership.role;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without company context
    next();
  }
};

module.exports = { protect, getCompanyContext };