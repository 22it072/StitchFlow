const CompanyUser = require('../models/CompanyUser');
const Company = require('../models/Company');
const { hasPermission, isRoleHigherOrEqual } = require('../utils/permissions');

// Verify company membership and attach company info to request
const verifyCompanyMembership = async (req, res, next) => {
  try {
    const companyId = req.headers['x-company-id'] || req.body.companyId || req.query.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Check if company exists and is active
    const company = await Company.findOne({ 
      _id: companyId, 
      isActive: true 
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or inactive'
      });
    }

    // Check user membership
    const membership = await CompanyUser.findOne({
      user: req.user._id,
      company: companyId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this company'
      });
    }

    // Attach company info to request
    req.company = company;
    req.companyId = companyId;
    req.userRole = membership.role;
    req.membership = membership;

    // Update last accessed
    membership.lastAccessedAt = new Date();
    await membership.save();

    next();
  } catch (error) {
    console.error('Company membership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying company membership'
    });
  }
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Role not determined'
      });
    }

    if (!hasPermission(req.userRole, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`
      });
    }

    next();
  };
};

// Check any of multiple permissions
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Role not determined'
      });
    }

    const hasAny = permissions.some(p => hasPermission(req.userRole, p));
    
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: One of [${permissions.join(', ')}] required`
      });
    }

    next();
  };
};

// Check specific role
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Role not determined'
      });
    }

    if (!roleArray.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: ${roleArray.join(' or ')} role required`
      });
    }

    next();
  };
};

// Check minimum role level
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Role not determined'
      });
    }

    if (!isRoleHigherOrEqual(req.userRole, minRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Minimum ${minRole} role required`
      });
    }

    next();
  };
};

// Verify user can manage target user's role
const canManageUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.body.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID required'
      });
    }

    // Get target user's membership
    const targetMembership = await CompanyUser.findOne({
      user: targetUserId,
      company: req.companyId,
      isActive: true
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found in this company'
      });
    }

    // Cannot manage yourself for role changes
    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify your own role'
      });
    }

    // Only super_admin can manage admins
    if (targetMembership.role === 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can manage Admin users'
      });
    }

    // Cannot manage super_admin
    if (targetMembership.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify Super Admin'
      });
    }

    req.targetMembership = targetMembership;
    next();
  } catch (error) {
    console.error('User management check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking user management permissions'
    });
  }
};

// Add company filter to query (for data isolation)
const addCompanyFilter = (req, res, next) => {
  if (!req.companyId) {
    return res.status(400).json({
      success: false,
      message: 'Company context required'
    });
  }

  // Add company filter to be used in queries
  req.companyFilter = { company: req.companyId };
  next();
};

module.exports = {
  verifyCompanyMembership,
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireMinRole,
  canManageUser,
  addCompanyFilter
};