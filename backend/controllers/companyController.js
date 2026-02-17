// backend/controllers/companyController.js
const Company = require('../models/Company');
const CompanyUser = require('../models/CompanyUser');

// Helper function to generate unique company code
const generateUniqueCompanyCode = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if code exists
    const existing = await Company.findOne({ companyCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    // Fallback: use timestamp-based code
    code = Date.now().toString(36).toUpperCase().slice(-8).padStart(8, 'X');
  }
  
  return code;
};

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private
const createCompany = async (req, res) => {
  try {
    console.log('Creating company, request body:', req.body);
    console.log('User:', req.user._id);
    
    const { name, description } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // Generate unique company code
    const companyCode = await generateUniqueCompanyCode();
    console.log('Generated company code:', companyCode);

    // Create company
    const company = new Company({
      name: name.trim(),
      description: description ? description.trim() : '',
      companyCode: companyCode,
      createdBy: req.user._id,
      settings: {
        defaultRole: 'viewer',
        allowJoinViaCode: true,
        maxUsers: 50
      }
    });

    await company.save();
    console.log('Company saved:', company._id);

    // Add creator as super_admin
    const companyUser = new CompanyUser({
      user: req.user._id,
      company: company._id,
      role: 'super_admin',
      invitedBy: null,
      joinedAt: new Date(),
      isActive: true
    });

    await companyUser.save();
    console.log('CompanyUser saved:', companyUser._id);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        company: {
          _id: company._id,
          name: company.name,
          companyCode: company.companyCode,
          description: company.description,
          settings: company.settings,
          createdAt: company.createdAt
        },
        role: 'super_admin'
      }
    });
  } catch (error) {
    console.error('Create company error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating company',
      error: error.message
    });
  }
};

// @desc    Join company via code
// @route   POST /api/companies/join
// @access  Private
const joinCompany = async (req, res) => {
  try {
    const { companyCode } = req.body;

    console.log('Join company request, code:', companyCode);

    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Company code is required'
      });
    }

    // Find company by code
    const company = await Company.findOne({ 
      companyCode: companyCode.toUpperCase().trim(),
      isActive: true
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Invalid company code'
      });
    }

    // Check if joining via code is allowed
    if (!company.settings.allowJoinViaCode) {
      return res.status(403).json({
        success: false,
        message: 'This company does not allow joining via code'
      });
    }

    // Check if already a member
    const existingMembership = await CompanyUser.findOne({
      user: req.user._id,
      company: company._id
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({
          success: false,
          message: 'You are already a member of this company'
        });
      } else {
        // Reactivate membership
        existingMembership.isActive = true;
        existingMembership.role = company.settings.defaultRole || 'viewer';
        existingMembership.joinedAt = new Date();
        await existingMembership.save();

        return res.status(200).json({
          success: true,
          message: 'Rejoined company successfully',
          data: {
            company: {
              _id: company._id,
              name: company.name,
              description: company.description
            },
            role: existingMembership.role
          }
        });
      }
    }

    // Create membership with default role
    const companyUser = new CompanyUser({
      user: req.user._id,
      company: company._id,
      role: company.settings.defaultRole || 'viewer',
      joinedAt: new Date(),
      isActive: true
    });

    await companyUser.save();

    res.status(200).json({
      success: true,
      message: 'Joined company successfully',
      data: {
        company: {
          _id: company._id,
          name: company.name,
          description: company.description
        },
        role: company.settings.defaultRole || 'viewer'
      }
    });
  } catch (error) {
    console.error('Join company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining company',
      error: error.message
    });
  }
};

// @desc    Get user's companies
// @route   GET /api/companies
// @access  Private
const getUserCompanies = async (req, res) => {
  try {
    console.log('Getting companies for user:', req.user._id);

    const memberships = await CompanyUser.find({
      user: req.user._id,
      isActive: true
    }).populate({
      path: 'company',
      select: 'name companyCode description logo isActive settings createdAt'
    }).sort({ lastAccessedAt: -1 });

    console.log('Found memberships:', memberships.length);

    const companies = memberships
      .filter(m => m.company && m.company.isActive)
      .map(m => ({
        _id: m.company._id,
        name: m.company.name,
        companyCode: m.company.companyCode,
        description: m.company.description,
        logo: m.company.logo,
        role: m.role,
        joinedAt: m.joinedAt,
        lastAccessedAt: m.lastAccessedAt
      }));

    res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get user companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
};

// @desc    Get company details
// @route   GET /api/companies/:companyId
// @access  Private (Member)
const getCompanyDetails = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate('createdBy', 'name email');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
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

    // Get user count
    const userCount = await CompanyUser.countDocuments({
      company: companyId,
      isActive: true
    });

    const companyData = {
      _id: company._id,
      name: company.name,
      companyCode: ['admin', 'super_admin'].includes(membership.role) 
        ? company.companyCode 
        : undefined,
      description: company.description,
      logo: company.logo,
      settings: company.settings,
      createdBy: company.createdBy,
      createdAt: company.createdAt,
      userCount,
      userRole: membership.role
    };

    res.status(200).json({
      success: true,
      data: companyData
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company details',
      error: error.message
    });
  }
};

// @desc    Update company
// @route   PUT /api/companies/:companyId
// @access  Private (Admin)
const updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, description, settings } = req.body;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update fields
    if (name) company.name = name.trim();
    if (description !== undefined) company.description = description.trim();
    if (settings) {
      company.settings = {
        ...company.settings,
        ...settings
      };
    }

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating company',
      error: error.message
    });
  }
};

// @desc    Regenerate company code
// @route   POST /api/companies/:companyId/regenerate-code
// @access  Private (Admin)
const regenerateCompanyCode = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Generate new code
    const newCode = await generateUniqueCompanyCode();
    company.companyCode = newCode;
    company.codeGeneratedAt = new Date();
    
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Company code regenerated successfully',
      data: {
        companyCode: company.companyCode,
        codeGeneratedAt: company.codeGeneratedAt
      }
    });
  } catch (error) {
    console.error('Regenerate code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating company code',
      error: error.message
    });
  }
};

// @desc    Leave company
// @route   POST /api/companies/:companyId/leave
// @access  Private
const leaveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const membership = await CompanyUser.findOne({
      user: req.user._id,
      company: companyId,
      isActive: true
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not a member of this company'
      });
    }

    // Check if user is the only super_admin
    if (membership.role === 'super_admin') {
      const otherSuperAdmins = await CompanyUser.countDocuments({
        company: companyId,
        role: 'super_admin',
        isActive: true,
        user: { $ne: req.user._id }
      });

      if (otherSuperAdmins === 0) {
        return res.status(403).json({
          success: false,
          message: 'Cannot leave: You are the only Super Admin. Transfer ownership first.'
        });
      }
    }

    // Deactivate membership
    membership.isActive = false;
    await membership.save();

    res.status(200).json({
      success: true,
      message: 'Left company successfully'
    });
  } catch (error) {
    console.error('Leave company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving company',
      error: error.message
    });
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:companyId
// @access  Private (Super Admin)
const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Soft delete - just mark as inactive
    await Company.findByIdAndUpdate(companyId, { isActive: false });

    // Deactivate all memberships
    await CompanyUser.updateMany(
      { company: companyId },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting company',
      error: error.message
    });
  }
};

module.exports = {
  createCompany,
  joinCompany,
  getUserCompanies,
  getCompanyDetails,
  updateCompany,
  regenerateCompanyCode,
  leaveCompany,
  deleteCompany
};