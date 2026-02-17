const LoomMaintenance = require('../models/LoomMaintenance');
const Loom = require('../models/Loom');
const { generateMaintenanceId } = require('../utils/weavingCodeGenerator');
const mongoose = require('mongoose');

/**
 * @desc    Get all maintenance records for company
 * @route   GET /api/weaving/maintenance
 * @access  Private (Viewer+)
 */
const getMaintenanceRecords = async (req, res) => {
  try {
    const { search, loomId, type, status, startDate, endDate, sort = 'scheduledDate', page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by loom
    if (loomId) {
      query.loomId = loomId;
    }
    
    // Filter by type
    if (type) {
      query.maintenanceType = type;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Date range
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }
    
    // Search
    if (search) {
      query.$or = [
        { maintenanceId: { $regex: search, $options: 'i' } },
        { technicianName: { $regex: search, $options: 'i' } },
      ];
    }
    
    let sortOption = {};
    if (sort === 'scheduledDate') sortOption = { scheduledDate: -1 };
    if (sort === 'actualDate') sortOption = { actualDate: -1 };
    if (sort === 'cost') sortOption = { totalCost: -1 };
    if (sort === 'status') sortOption = { status: 1, scheduledDate: -1 };
    
    const skip = (page - 1) * limit;
    
    const records = await LoomMaintenance.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('loomId', 'loomNumber loomType')
      .populate('createdBy', 'name email')
      .lean();
    
    const total = await LoomMaintenance.countDocuments(query);
    
    res.json({
      success: true,
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get maintenance records error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single maintenance record
 * @route   GET /api/weaving/maintenance/:id
 * @access  Private (Viewer+)
 */
const getMaintenanceRecord = async (req, res) => {
  try {
    const record = await LoomMaintenance.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('loomId')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Get maintenance record error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create maintenance record
 * @route   POST /api/weaving/maintenance
 * @access  Private (Supervisor+)
 */
const createMaintenanceRecord = async (req, res) => {
  try {
    const {
      loomId,
      maintenanceType,
      scheduledDate,
      actualDate,
      durationHours,
      technicianName,
      partsReplaced,
      totalCost,
      nextServiceDue,
      description,
      notes,
    } = req.body;
    
    // Validate required fields
    if (!loomId || !maintenanceType || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Loom, maintenance type, and scheduled date are required',
      });
    }
    
    // Validate loom
    const loom = await Loom.findOne({
      _id: loomId,
      company: req.companyId,
    });
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    // Generate maintenance ID
    const maintenanceId = await generateMaintenanceId(req.companyId);
    
    // Calculate total cost from parts if not provided
    let calculatedCost = totalCost || 0;
    if (!totalCost && partsReplaced && partsReplaced.length > 0) {
      calculatedCost = partsReplaced.reduce((sum, part) => {
        return sum + (part.cost || 0) * (part.quantity || 1);
      }, 0);
    }
    
    // Determine status
    let status = 'Scheduled';
    if (actualDate) {
      status = 'Completed';
    }
    
    const record = await LoomMaintenance.create({
      company: req.companyId,
      maintenanceId,
      loomId,
      maintenanceType,
      scheduledDate: new Date(scheduledDate),
      actualDate: actualDate ? new Date(actualDate) : null,
      durationHours: durationHours || 0,
      technicianName: technicianName || '',
      partsReplaced: partsReplaced || [],
      totalCost: calculatedCost,
      nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
      status,
      description: description || '',
      notes: notes || '',
      createdBy: req.user._id,
    });
    
    // Update loom maintenance dates
    if (actualDate) {
      loom.lastMaintenanceDate = new Date(actualDate);
    }
    if (nextServiceDue) {
      loom.nextMaintenanceDate = new Date(nextServiceDue);
    }
    
    // Update loom status if maintenance is in progress
    if (status === 'In Progress') {
      loom.status = 'Under Maintenance';
    }
    
    await loom.save();
    
    const populatedRecord = await LoomMaintenance.findById(record._id)
      .populate('loomId', 'loomNumber loomType')
      .lean();
    
    res.status(201).json({
      success: true,
      record: populatedRecord,
    });
  } catch (error) {
    console.error('Create maintenance record error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update maintenance record
 * @route   PUT /api/weaving/maintenance/:id
 * @access  Private (Supervisor+)
 */
const updateMaintenanceRecord = async (req, res) => {
  try {
    const record = await LoomMaintenance.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    const {
      maintenanceType,
      scheduledDate,
      actualDate,
      durationHours,
      technicianName,
      partsReplaced,
      totalCost,
      nextServiceDue,
      status,
      description,
      notes,
    } = req.body;
    
    // Update fields
    if (maintenanceType) record.maintenanceType = maintenanceType;
    if (scheduledDate) record.scheduledDate = new Date(scheduledDate);
    if (actualDate !== undefined) record.actualDate = actualDate ? new Date(actualDate) : null;
    if (durationHours !== undefined) record.durationHours = parseFloat(durationHours);
    if (technicianName !== undefined) record.technicianName = technicianName;
    if (partsReplaced) record.partsReplaced = partsReplaced;
    if (nextServiceDue !== undefined) record.nextServiceDue = nextServiceDue ? new Date(nextServiceDue) : null;
    if (status) record.status = status;
    if (description !== undefined) record.description = description;
    if (notes !== undefined) record.notes = notes;
    
    // Recalculate cost if parts changed
    if (partsReplaced && !totalCost) {
      record.totalCost = partsReplaced.reduce((sum, part) => {
        return sum + (part.cost || 0) * (part.quantity || 1);
      }, 0);
    } else if (totalCost !== undefined) {
      record.totalCost = parseFloat(totalCost);
    }
    
    await record.save();
    
    // Update loom if maintenance completed
    if (status === 'Completed' && record.actualDate) {
      const loom = await Loom.findById(record.loomId);
      if (loom) {
        loom.lastMaintenanceDate = record.actualDate;
        if (record.nextServiceDue) {
          loom.nextMaintenanceDate = record.nextServiceDue;
        }
        if (loom.status === 'Under Maintenance') {
          loom.status = 'Idle';
        }
        await loom.save();
      }
    }
    
    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Update maintenance record error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update maintenance status
 * @route   PUT /api/weaving/maintenance/:id/status
 * @access  Private (Supervisor+)
 */
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const record = await LoomMaintenance.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    const validStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }
    
    const oldStatus = record.status;
    record.status = status;
    
    // Update loom status based on maintenance status
    const loom = await Loom.findById(record.loomId);
    if (loom) {
      if (status === 'In Progress') {
        loom.status = 'Under Maintenance';
      } else if (status === 'Completed' && oldStatus === 'In Progress') {
        loom.status = 'Idle';
        if (!record.actualDate) {
          record.actualDate = new Date();
        }
        loom.lastMaintenanceDate = record.actualDate;
      } else if (status === 'Cancelled' && oldStatus === 'In Progress') {
        loom.status = 'Idle';
      }
      await loom.save();
    }
    
    await record.save();
    
    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Update maintenance status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete maintenance record
 * @route   DELETE /api/weaving/maintenance/:id
 * @access  Private (Admin+)
 */
const deleteMaintenanceRecord = async (req, res) => {
  try {
    const record = await LoomMaintenance.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }
    
    // If maintenance is in progress, revert loom status
    if (record.status === 'In Progress') {
      const loom = await Loom.findById(record.loomId);
      if (loom && loom.status === 'Under Maintenance') {
        loom.status = 'Idle';
        await loom.save();
      }
    }
    
    await record.deleteOne();
    
    res.json({
      success: true,
      message: 'Maintenance record deleted successfully',
    });
  } catch (error) {
    console.error('Delete maintenance record error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get maintenance statistics
 * @route   GET /api/weaving/maintenance/stats
 * @access  Private (Viewer+)
 */
const getMaintenanceStats = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Type distribution
    const typeStats = await LoomMaintenance.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$maintenanceType',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          avgDuration: { $avg: '$durationHours' },
        },
      },
    ]);
    
    // Status distribution
    const statusStats = await LoomMaintenance.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Upcoming maintenance
    const upcomingCount = await LoomMaintenance.countDocuments({
      company: companyObjectId,
      status: 'Scheduled',
      scheduledDate: { $gte: new Date() },
    });
    
    // Overdue maintenance
    const overdueCount = await LoomMaintenance.countDocuments({
      company: companyObjectId,
      status: 'Scheduled',
      scheduledDate: { $lt: new Date() },
    });
    
    // Total maintenance cost (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const costStats = await LoomMaintenance.aggregate([
      {
        $match: {
          company: companyObjectId,
          actualDate: { $gte: sixMonthsAgo },
          status: 'Completed',
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          avgCost: { $avg: '$totalCost' },
        },
      },
    ]);
    
    res.json({
      success: true,
      stats: {
        typeDistribution: typeStats,
        statusDistribution: statusStats,
        upcomingCount,
        overdueCount,
        costSummary: costStats[0] || { totalCost: 0, avgCost: 0 },
      },
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get upcoming maintenance alerts
 * @route   GET /api/weaving/maintenance/alerts
 * @access  Private (Viewer+)
 */
const getMaintenanceAlerts = async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    
    // Get scheduled maintenance in next 7 days
    const upcoming = await LoomMaintenance.find({
      company: req.companyId,
      status: 'Scheduled',
      scheduledDate: { $gte: today, $lte: next7Days },
    })
      .populate('loomId', 'loomNumber loomType')
      .sort({ scheduledDate: 1 })
      .lean();
    
    // Get overdue maintenance
    const overdue = await LoomMaintenance.find({
      company: req.companyId,
      status: 'Scheduled',
      scheduledDate: { $lt: today },
    })
      .populate('loomId', 'loomNumber loomType')
      .sort({ scheduledDate: 1 })
      .lean();
    
    // Get looms with next maintenance due
    const loomsDue = await Loom.find({
      company: req.companyId,
      isActive: true,
      nextMaintenanceDate: { $lte: next7Days },
    })
      .select('loomNumber loomType nextMaintenanceDate')
      .sort({ nextMaintenanceDate: 1 })
      .lean();
    
    res.json({
      success: true,
      alerts: {
        upcoming,
        overdue,
        loomsDue,
      },
    });
  } catch (error) {
    console.error('Get maintenance alerts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMaintenanceRecords,
  getMaintenanceRecord,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord,
  getMaintenanceStats,
  getMaintenanceAlerts,
};