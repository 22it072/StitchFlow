// backend/controllers/userManagementController.js
const CompanyUser = require('../models/CompanyUser');
const Company = require('../models/Company');

// @desc    Get all users in company
// @route   GET /api/companies/:companyId/users
// @access  Private (Admin)
const getCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req.params;

    const memberships = await CompanyUser.find({
      company: companyId,
      isActive: true
    })
    .populate('user', 'name email')
    .populate('invitedBy', 'name email')
    .sort({ role: -1, joinedAt: -1 });

    const users = memberships.map(m => ({
      _id: m.user._id,
      membershipId: m._id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
      lastAccessedAt: m.lastAccessedAt,
      invitedBy: m.invitedBy ? {
        _id: m.invitedBy._id,
        name: m.invitedBy.name
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company users',
      error: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/companies/:companyId/users/stats
// @access  Private (Admin)
const getUserStats = async (req, res) => {
  try {
    const { companyId } = req.params;

    const stats = await CompanyUser.aggregate([
      { 
        $match: { 
          company: require('mongoose').Types.ObjectId(companyId), 
          isActive: true 
        } 
      },
      { 
        $group: { 
          _id: '$role', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const roleStats = {
      viewer: 0,
      editor: 0,
      admin: 0,
      super_admin: 0,
      total: 0
    };

    stats.forEach(s => {
      roleStats[s._id] = s.count;
      roleStats.total += s.count;
    });

    res.status(200).json({
      success: true,
      data: roleStats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

// @desc    Change user role
// @route   PUT /api/companies/:companyId/users/:userId/role
// @access  Private (Admin)
const changeUserRole = async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { role } = req.body;

    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles: ${validRoles.join(', ')}`
      });
    }

    const membership = await CompanyUser.findOne({
      user: userId,
      company: companyId,
      isActive: true
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'User not found in this company'
      });
    }

    // Cannot change own role
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const oldRole = membership.role;
    membership.role = role;
    await membership.save();

    res.status(200).json({
      success: true,
      message: `User role changed from ${oldRole} to ${role}`,
      data: {
        userId,
        oldRole,
        newRole: role
      }
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing user role',
      error: error.message
    });
  }
};

// @desc    Remove user from company
// @route   DELETE /api/companies/:companyId/users/:userId
// @access  Private (Admin)
const removeUser = async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const membership = await CompanyUser.findOne({
      user: userId,
      company: companyId,
      isActive: true
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'User not found in this company'
      });
    }

    // Cannot remove yourself
    if (userId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove yourself. Use leave company instead.'
      });
    }

    // Soft delete
    membership.isActive = false;
    await membership.save();

    res.status(200).json({
      success: true,
      message: 'User removed from company successfully'
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing user',
      error: error.message
    });
  }
};

// @desc    Transfer ownership
// @route   POST /api/companies/:companyId/transfer-ownership
// @access  Private (Super Admin)
const transferOwnership = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { newOwnerId } = req.body;

    if (newOwnerId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer ownership to yourself'
      });
    }

    // Get new owner's membership
    const newOwnerMembership = await CompanyUser.findOne({
      user: newOwnerId,
      company: companyId,
      isActive: true
    });

    if (!newOwnerMembership) {
      return res.status(404).json({
        success: false,
        message: 'New owner must be a member of this company'
      });
    }

    // Get current user's membership
    const currentMembership = await CompanyUser.findOne({
      user: req.user._id,
      company: companyId,
      isActive: true
    });

    // Transfer ownership
    newOwnerMembership.role = 'super_admin';
    currentMembership.role = 'admin';

    await newOwnerMembership.save();
    await currentMembership.save();

    // Update company createdBy
    await Company.findByIdAndUpdate(companyId, { createdBy: newOwnerId });

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully',
      data: {
        newOwner: newOwnerId,
        previousOwnerRole: 'admin'
      }
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error transferring ownership',
      error: error.message
    });
  }
};

module.exports = {
  getCompanyUsers,
  getUserStats,
  changeUserRole,
  removeUser,
  transferOwnership
};