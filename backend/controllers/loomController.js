const Loom = require('../models/Loom');
const WeavingSet = require('../models/WeavingSet');
const WeavingProduction = require('../models/WeavingProduction');
const { generateLoomNumber } = require('../utils/weavingCodeGenerator');
const mongoose = require('mongoose');

/**
 * @desc    Get all looms for company
 * @route   GET /api/weaving/looms
 * @access  Private (Viewer+)
 */
const getLooms = async (req, res) => {
  try {
    const { search, status, type, location, sort = 'loomNumber', page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId, isActive: true };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by type
    if (type) {
      query.loomType = type;
    }
    
    // Filter by location
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Search
    if (search) {
      query.$or = [
        { loomNumber: { $regex: search, $options: 'i' } },
        { operatorAssigned: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    
    let sortOption = {};
    if (sort === 'loomNumber') sortOption = { loomNumber: 1 };
    if (sort === 'status') sortOption = { status: 1, loomNumber: 1 };
    if (sort === 'type') sortOption = { loomType: 1, loomNumber: 1 };
    if (sort === 'runningHours') sortOption = { totalRunningHours: -1 };
    
    const skip = (page - 1) * limit;
    
    const looms = await Loom.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('currentSetId', 'setNumber qualityName')
      .populate('currentBeamId', 'beamNumber qualityName')
      .populate('createdBy', 'name email')
      .lean();
    
    const total = await Loom.countDocuments(query);
    
    res.json({
      success: true,
      looms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get looms error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single loom with details
 * @route   GET /api/weaving/looms/:id
 * @access  Private (Viewer+)
 */
const getLoom = async (req, res) => {
  try {
    const loom = await Loom.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('currentSetId')
      .populate('currentBeamId')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    // Get recent production history
    const recentProduction = await WeavingProduction.find({
      company: req.companyId,
      loomId: loom._id,
    })
      .sort({ entryDate: -1 })
      .limit(10)
      .populate('setId', 'setNumber qualityName')
      .lean();
    
    res.json({
      success: true,
      loom: {
        ...loom,
        recentProduction,
      },
    });
  } catch (error) {
    console.error('Get loom error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create loom
 * @route   POST /api/weaving/looms
 * @access  Private (Supervisor+)
 */
const createLoom = async (req, res) => {
  try {
    const {
      loomType,
      loomMake,
      reedWidth,
      reedWidthUnit,
      rpm,
      purchaseDate,
      location,
      operatorAssigned,
      notes,
    } = req.body;
    
    // Validate required fields
    if (!loomType || !reedWidth || !rpm) {
      return res.status(400).json({
        success: false,
        message: 'Loom type, reed width, and RPM are required',
      });
    }
    
    // Generate loom number
    const loomNumber = await generateLoomNumber(req.companyId);
    
    const loom = await Loom.create({
      company: req.companyId,
      loomNumber,
      loomType,
      loomMake: loomMake || '',
      reedWidth: parseFloat(reedWidth),
      reedWidthUnit: reedWidthUnit || 'inches',
      rpm: parseFloat(rpm),
      status: 'Idle',
      purchaseDate: purchaseDate || null,
      location: location || '',
      operatorAssigned: operatorAssigned || null,
      notes: notes || '',
      createdBy: req.user._id,
    });
    
    res.status(201).json({
      success: true,
      loom,
    });
  } catch (error) {
    console.error('Create loom error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update loom
 * @route   PUT /api/weaving/looms/:id
 * @access  Private (Supervisor+)
 */
const updateLoom = async (req, res) => {
  try {
    const loom = await Loom.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    const {
      loomType,
      loomMake,
      reedWidth,
      reedWidthUnit,
      rpm,
      status,
      purchaseDate,
      location,
      operatorAssigned,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
    } = req.body;
    
    // Update fields
    if (loomType) loom.loomType = loomType;
    if (loomMake !== undefined) loom.loomMake = loomMake;
    if (reedWidth) loom.reedWidth = parseFloat(reedWidth);
    if (reedWidthUnit) loom.reedWidthUnit = reedWidthUnit;
    if (rpm) loom.rpm = parseFloat(rpm);
    if (status) loom.status = status;
    if (purchaseDate !== undefined) loom.purchaseDate = purchaseDate;
    if (location !== undefined) loom.location = location;
    if (operatorAssigned !== undefined) loom.operatorAssigned = operatorAssigned;
    if (lastMaintenanceDate !== undefined) loom.lastMaintenanceDate = lastMaintenanceDate;
    if (nextMaintenanceDate !== undefined) loom.nextMaintenanceDate = nextMaintenanceDate;
    if (notes !== undefined) loom.notes = notes;
    
    await loom.save();
    
    res.json({
      success: true,
      loom,
    });
  } catch (error) {
    console.error('Update loom error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update loom status
 * @route   PUT /api/weaving/looms/:id/status
 * @access  Private (Operator+)
 */
const updateLoomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const loom = await Loom.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    const validStatuses = ['Active', 'Idle', 'Under Maintenance', 'Breakdown'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }
    
    loom.status = status;
    await loom.save();
    
    res.json({
      success: true,
      loom,
    });
  } catch (error) {
    console.error('Update loom status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete loom (soft delete)
 * @route   DELETE /api/weaving/looms/:id
 * @access  Private (Admin+)
 */
const deleteLoom = async (req, res) => {
  try {
    const loom = await Loom.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    // Check if loom is currently in use
    if (loom.status === 'Active' || loom.currentSetId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete loom that is currently in use',
      });
    }
    
    // Soft delete
    loom.isActive = false;
    await loom.save();
    
    res.json({
      success: true,
      message: 'Loom deactivated successfully',
    });
  } catch (error) {
    console.error('Delete loom error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get loom statistics
 * @route   GET /api/weaving/looms/stats
 * @access  Private (Viewer+)
 */
const getLoomStats = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Status distribution
    const statusStats = await Loom.aggregate([
      { $match: { company: companyObjectId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRunningHours: { $avg: '$totalRunningHours' },
        },
      },
    ]);
    
    // Type distribution
    const typeStats = await Loom.aggregate([
      { $match: { company: companyObjectId, isActive: true } },
      {
        $group: {
          _id: '$loomType',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Total looms
    const totalLooms = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
    });
    
    // Active looms
    const activeLooms = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
      status: 'Active',
    });
    
    // Maintenance due
    const maintenanceDue = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
      nextMaintenanceDate: { $lte: new Date() },
    });
    
    res.json({
      success: true,
      stats: {
        totalLooms,
        activeLooms,
        maintenanceDue,
        statusDistribution: statusStats,
        typeDistribution: typeStats,
      },
    });
  } catch (error) {
    console.error('Get loom stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get available looms (for allocation)
 * @route   GET /api/weaving/looms/available
 * @access  Private (Supervisor+)
 */
const getAvailableLooms = async (req, res) => {
  try {
    const looms = await Loom.find({
      company: req.companyId,
      isActive: true,
      status: 'Idle',
      currentSetId: null,
    })
      .select('loomNumber loomType reedWidth rpm location')
      .sort({ loomNumber: 1 })
      .lean();
    
    res.json({
      success: true,
      looms,
    });
  } catch (error) {
    console.error('Get available looms error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getLooms,
  getLoom,
  createLoom,
  updateLoom,
  updateLoomStatus,
  deleteLoom,
  getLoomStats,
  getAvailableLooms,
};