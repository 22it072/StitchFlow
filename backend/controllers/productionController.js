// backend/controllers/productionController.js
const Production = require('../models/Production');
const Estimate = require('../models/Estimate');
const {
  calculateProduction,
  validateProductionInputs,
  getProductionBreakdown
} = require('../utils/productionCalculations');

/**
 * @desc    Create new production record
 * @route   POST /api/productions
 * @access  Private
 */
const createProduction = async (req, res) => {
  try {
    const {
      estimateId,
      qualityName,
      rpm,
      pick,
      efficiency,
      machines,
      workingHours,
      workingDaysPerMonth,
      notes
    } = req.body;
    
    // Validate required fields
    if (!qualityName || !qualityName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Quality name is required'
      });
    }
    
    // Validate production inputs
    const validation = validateProductionInputs({ rpm, pick, efficiency, machines, workingHours });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    // Calculate production
    const productionData = calculateProduction({
      rpm,
      pick,
      efficiency,
      machines,
      workingHours,
      workingDaysPerMonth: workingDaysPerMonth || 26
    });
    
    // Get reference data from estimate if provided
    let referenceData = {};
    if (estimateId) {
      const estimate = await Estimate.findById(estimateId);
      if (estimate) {
        referenceData = {
          panna: estimate.fabricDetails?.ppiPanna || estimate.ppiDetails?.panna,
          reedSpace: estimate.fabricDetails?.reedSpace,
          warpCount: estimate.warpDetails?.count,
          weftCount: estimate.weftDetails?.count
        };
      }
    }
    
    // Get company ID from request (set by middleware)
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }
    
    // Create production record
    const production = await Production.create({
      company: companyId,
      estimateId: estimateId || null,
      qualityName: qualityName.trim(),
      loomParams: {
        rpm,
        pick,
        efficiency,
        machines,
        workingHours
      },
      calculations: {
        rawPicksPerDay: productionData.daily.rawPicksPerDay,
        rawProductionMeters: productionData.daily.rawProductionMeters,
        formattedProduction: productionData.daily.formattedProduction,
        formattedScale: productionData.daily.formattedScale,
        magnitude: productionData.daily.magnitude,
        monthlyProduction: {
          raw: productionData.monthly.rawProduction,
          formatted: productionData.monthly.formattedProduction,
          scale: productionData.monthly.formattedScale,
          workingDays: workingDaysPerMonth || 26
        }
      },
      referenceData,
      notes: notes || '',
      user: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: production,
      formulas: productionData.formulas
    });
    
  } catch (error) {
    console.error('Create production error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating production record',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};

/**
 * @desc    Get all production records for user
 * @route   GET /api/productions
 * @access  Private
 */
const getProductions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      sortBy = 'createdAt', 
      order = 'desc' 
    } = req.query;
    
    // Get company ID from request
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }
    
    // Build query - filter by company
    const query = { 
      company: companyId,
      user: req.user._id 
    };
    
    if (status && ['active', 'completed', 'archived'].includes(status)) {
      query.status = status;
    }
    
    if (search) {
      query.qualityName = { $regex: search, $options: 'i' };
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [productions, total] = await Promise.all([
      Production.find(query)
        .populate('estimateId', 'qualityName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Production.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: productions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get productions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching production records',
      error: error.message
    });
  }
};

/**
 * @desc    Get single production record with full breakdown
 * @route   GET /api/productions/:id
 * @access  Private
 */
const getProductionById = async (req, res) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate('estimateId')
      .lean();
    
    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }
    
    // Check ownership
    if (production.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this record'
      });
    }
    
    // Get detailed breakdown
    const breakdown = getProductionBreakdown(production);
    
    res.json({
      success: true,
      data: production,
      breakdown
    });
    
  } catch (error) {
    console.error('Get production by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching production record',
      error: error.message
    });
  }
};

/**
 * @desc    Calculate production preview (without saving)
 * @route   POST /api/productions/calculate
 * @access  Private
 */
const calculateProductionPreview = async (req, res) => {
  try {
    const { rpm, pick, efficiency, machines, workingHours, workingDaysPerMonth } = req.body;
    
    const validation = validateProductionInputs({ rpm, pick, efficiency, machines, workingHours });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    const productionData = calculateProduction({
      rpm,
      pick,
      efficiency,
      machines,
      workingHours,
      workingDaysPerMonth: workingDaysPerMonth || 26
    });
    
    res.json({
      success: true,
      data: productionData
    });
    
  } catch (error) {
    console.error('Calculate production error:', error);
    
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error calculating production',
      error: error.message
    });
  }
};

/**
 * @desc    Update production record
 * @route   PUT /api/productions/:id
 * @access  Private
 */
const updateProduction = async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    
    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }
    
    // Check ownership
    if (production.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }
    
    const {
      qualityName,
      rpm,
      pick,
      efficiency,
      machines,
      workingHours,
      workingDaysPerMonth,
      notes,
      status
    } = req.body;
    
    // If any loom parameters are being updated, recalculate
    if (rpm !== undefined || pick !== undefined || efficiency !== undefined || 
        machines !== undefined || workingHours !== undefined) {
      
      const newParams = {
        rpm: rpm !== undefined ? rpm : production.loomParams.rpm,
        pick: pick !== undefined ? pick : production.loomParams.pick,
        efficiency: efficiency !== undefined ? efficiency : production.loomParams.efficiency,
        machines: machines !== undefined ? machines : production.loomParams.machines,
        workingHours: workingHours !== undefined ? workingHours : production.loomParams.workingHours
      };
      
      const validation = validateProductionInputs(newParams);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }
      
      const productionData = calculateProduction({
        ...newParams,
        workingDaysPerMonth: workingDaysPerMonth || production.calculations.monthlyProduction?.workingDays || 26
      });
      
      production.loomParams = newParams;
      production.calculations = {
        rawPicksPerDay: productionData.daily.rawPicksPerDay,
        rawProductionMeters: productionData.daily.rawProductionMeters,
        formattedProduction: productionData.daily.formattedProduction,
        formattedScale: productionData.daily.formattedScale,
        magnitude: productionData.daily.magnitude,
        monthlyProduction: {
          raw: productionData.monthly.rawProduction,
          formatted: productionData.monthly.formattedProduction,
          scale: productionData.monthly.formattedScale,
          workingDays: workingDaysPerMonth || 26
        }
      };
    }
    
    if (qualityName !== undefined) production.qualityName = qualityName.trim();
    if (notes !== undefined) production.notes = notes;
    if (status !== undefined && ['active', 'completed', 'archived'].includes(status)) {
      production.status = status;
    }
    
    await production.save();
    
    res.json({
      success: true,
      data: production
    });
    
  } catch (error) {
    console.error('Update production error:', error);
    
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating production record',
      error: error.message
    });
  }
};

/**
 * @desc    Delete production record
 * @route   DELETE /api/productions/:id
 * @access  Private
 */
const deleteProduction = async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    
    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }
    
    // Check ownership
    if (production.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }
    
    await production.deleteOne();
    
    res.json({
      success: true,
      message: 'Production record deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete production error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting production record',
      error: error.message
    });
  }
};

/**
 * @desc    Get production statistics for dashboard
 * @route   GET /api/productions/stats
 * @access  Private
 */
const getProductionStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }
    
    const mongoose = require('mongoose');
    
    // Aggregate statistics - filter by company
    const stats = await Production.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          avgEfficiency: { $avg: '$loomParams.efficiency' },
          totalMachines: { $sum: '$loomParams.machines' },
          avgDailyProduction: { $avg: '$calculations.rawProductionMeters' },
          maxDailyProduction: { $max: '$calculations.rawProductionMeters' },
          avgRPM: { $avg: '$loomParams.rpm' },
          avgPick: { $avg: '$loomParams.pick' }
        }
      }
    ]);
    
    // Recent productions (last 5)
    const recentProductions = await Production.find({ company: companyId, user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('qualityName calculations.formattedProduction calculations.formattedScale loomParams.efficiency createdAt status')
      .lean();
    
    // Production trend (last 10 records for mini chart)
    const productionTrend = await Production.find({ company: companyId, user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('calculations.rawProductionMeters loomParams.efficiency createdAt')
      .lean();
    
    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalRecords: 0,
          avgEfficiency: 0,
          totalMachines: 0,
          avgDailyProduction: 0,
          maxDailyProduction: 0,
          avgRPM: 0,
          avgPick: 0
        },
        recentProductions,
        productionTrend: productionTrend.reverse()
      }
    });
    
  } catch (error) {
    console.error('Get production stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching production statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get production analytics data
 * @route   GET /api/productions/analytics
 * @access  Private
 */
const getProductionAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const userId = req.user._id;
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }
    
    const mongoose = require('mongoose');
    
    const matchStage = { 
      company: new mongoose.Types.ObjectId(companyId),
      user: userId, 
      createdAt: { $gte: startDate } 
    };
    
    // Production vs Efficiency correlation
    const efficiencyData = await Production.find(matchStage)
      .select('loomParams.efficiency calculations.rawProductionMeters qualityName')
      .sort({ 'loomParams.efficiency': 1 })
      .lean();
    
    // Production vs RPM correlation
    const rpmData = await Production.find(matchStage)
      .select('loomParams.rpm calculations.rawProductionMeters qualityName')
      .sort({ 'loomParams.rpm': 1 })
      .lean();
    
    // Machine utilization distribution
    const machineData = await Production.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$loomParams.machines',
          count: { $sum: 1 },
          avgProduction: { $avg: '$calculations.rawProductionMeters' },
          avgEfficiency: { $avg: '$loomParams.efficiency' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Daily production trend
    const dailyTrend = await Production.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalProduction: { $sum: '$calculations.rawProductionMeters' },
          avgEfficiency: { $avg: '$loomParams.efficiency' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Efficiency distribution
    const efficiencyDistribution = await Production.aggregate([
      { $match: matchStage },
      {
        $bucket: {
          groupBy: '$loomParams.efficiency',
          boundaries: [0, 60, 70, 80, 90, 101],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgProduction: { $avg: '$calculations.rawProductionMeters' }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        efficiencyCorrelation: efficiencyData.map(d => ({
          efficiency: d.loomParams.efficiency,
          production: d.calculations.rawProductionMeters,
          quality: d.qualityName
        })),
        rpmCorrelation: rpmData.map(d => ({
          rpm: d.loomParams.rpm,
          production: d.calculations.rawProductionMeters,
          quality: d.qualityName
        })),
        machineUtilization: machineData,
        dailyTrend,
        efficiencyDistribution
      }
    });
    
  } catch (error) {
    console.error('Get production analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching production analytics',
      error: error.message
    });
  }
};

module.exports = {
  createProduction,
  getProductions,
  getProductionById,
  calculateProductionPreview,
  updateProduction,
  deleteProduction,
  getProductionStats,
  getProductionAnalytics
};