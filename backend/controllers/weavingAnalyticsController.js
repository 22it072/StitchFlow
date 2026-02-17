const WeavingProduction = require('../models/WeavingProduction');
const WeavingSet = require('../models/WeavingSet');
const Loom = require('../models/Loom');
const Beam = require('../models/Beam');
const LoomMaintenance = require('../models/LoomMaintenance');
const { generateProductionSummary, getLoomPerformance } = require('../utils/weavingCalculations');
const mongoose = require('mongoose');

/**
 * @desc    Get weaving dashboard data
 * @route   GET /api/weaving/analytics/dashboard
 * @access  Private (Viewer+)
 */
const getWeavingDashboard = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Total active looms
    const totalActiveLooms = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
      status: 'Active',
    });
    
    // Today's production
    const todayProduction = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          totalMeters: { $sum: '$metersProduced' },
        },
      },
    ]);
    
    // Average efficiency
    const avgEfficiency = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          avgEff: { $avg: '$efficiency' },
        },
      },
    ]);
    
    // Looms under maintenance
    const loomsUnderMaintenance = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
      status: 'Under Maintenance',
    });
    
    // Breakdown count (today)
    const breakdownCount = await Loom.countDocuments({
      company: companyObjectId,
      isActive: true,
      status: 'Breakdown',
    });
    
    // Pending orders
    const pendingOrders = await WeavingSet.countDocuments({
      company: companyObjectId,
      status: 'Pending',
    });
    
    // In-progress sets
    const inProgressSets = await WeavingSet.countDocuments({
      company: companyObjectId,
      status: 'In Progress',
    });
    
    // Completed sets (this month)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedSets = await WeavingSet.countDocuments({
      company: companyObjectId,
      status: 'Completed',
      actualCompletionDate: { $gte: monthStart },
    });
    
    res.json({
      success: true,
      dashboard: {
        totalActiveLooms,
        todayProduction: todayProduction[0]?.totalMeters || 0,
        avgEfficiency: avgEfficiency[0]?.avgEff || 0,
        loomsUnderMaintenance,
        breakdownCount,
        pendingOrders,
        inProgressSets,
        completedSets,
      },
    });
  } catch (error) {
    console.error('Get weaving dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get loom status distribution
 * @route   GET /api/weaving/analytics/loom-status
 * @access  Private (Viewer+)
 */
const getLoomStatusDistribution = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const distribution = await Loom.aggregate([
      { $match: { company: companyObjectId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      success: true,
      distribution,
    });
  } catch (error) {
    console.error('Get loom status distribution error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get daily production trend
 * @route   GET /api/weaving/analytics/production-trend
 * @access  Private (Viewer+)
 */
const getProductionTrend = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const trend = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$entryDate' } },
          totalMeters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    res.json({
      success: true,
      trend,
    });
  } catch (error) {
    console.error('Get production trend error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get loom-wise efficiency comparison
 * @route   GET /api/weaving/analytics/loom-efficiency
 * @access  Private (Viewer+)
 */
const getLoomEfficiencyComparison = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const comparison = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$loomId',
          avgEfficiency: { $avg: '$efficiency' },
          totalMeters: { $sum: '$metersProduced' },
          totalHours: { $sum: '$totalHours' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { avgEfficiency: -1 } },
    ]);
    
    // Populate loom details
    await WeavingProduction.populate(comparison, {
      path: '_id',
      select: 'loomNumber loomType',
    });
    
    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error('Get loom efficiency comparison error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get shift-wise production
 * @route   GET /api/weaving/analytics/shift-production
 * @access  Private (Viewer+)
 */
const getShiftProduction = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const shiftData = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$shift',
          totalMeters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    res.json({
      success: true,
      shiftData,
    });
  } catch (error) {
    console.error('Get shift production error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get defect trend analysis
 * @route   GET /api/weaving/analytics/defect-trend
 * @access  Private (Viewer+)
 */
const getDefectTrend = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Daily defect trend
    const dailyTrend = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$entryDate' } },
          totalDefects: { $sum: '$defects.count' },
          totalMeters: { $sum: '$metersProduced' },
        },
      },
      {
        $project: {
          _id: 1,
          totalDefects: 1,
          totalMeters: 1,
          defectRate: {
            $cond: [
              { $eq: ['$totalMeters', 0] },
              0,
              { $multiply: [{ $divide: ['$totalDefects', '$totalMeters'] }, 100] },
            ],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Defect type distribution
    const typeDistribution = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
          'defects.types': { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$defects.types' },
      {
        $group: {
          _id: '$defects.types',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    res.json({
      success: true,
      defectAnalysis: {
        dailyTrend,
        typeDistribution,
      },
    });
  } catch (error) {
    console.error('Get defect trend error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get top performing looms
 * @route   GET /api/weaving/analytics/top-looms
 * @access  Private (Viewer+)
 */
const getTopPerformingLooms = async (req, res) => {
  try {
    const { period = '30', limit = 5 } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const topLooms = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$loomId',
          totalMeters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
          totalHours: { $sum: '$totalHours' },
          avgMPH: { $avg: '$metersPerHour' },
        },
      },
      { $sort: { totalMeters: -1 } },
      { $limit: parseInt(limit) },
    ]);
    
    // Populate loom details
    await WeavingProduction.populate(topLooms, {
      path: '_id',
      select: 'loomNumber loomType status',
    });
    
    res.json({
      success: true,
      topLooms,
    });
  } catch (error) {
    console.error('Get top performing looms error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get order completion tracking
 * @route   GET /api/weaving/analytics/order-completion
 * @access  Private (Viewer+)
 */
const getOrderCompletionTracking = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Active orders with completion percentage
    const activeOrders = await WeavingSet.find({
      company: companyObjectId,
      status: { $in: ['Pending', 'In Progress'] },
    })
      .select('setNumber qualityName orderQuantity producedQuantity status priority expectedCompletionDate')
      .populate('partyId', 'partyName')
      .lean();
    
    // Calculate completion percentages
    const ordersWithProgress = activeOrders.map(order => ({
      ...order,
      completionPercent: ((order.producedQuantity / order.orderQuantity) * 100).toFixed(2),
      remainingQuantity: order.orderQuantity - order.producedQuantity,
    }));
    
    // Delayed orders (past expected completion date but not completed)
    const today = new Date();
    const delayedOrders = ordersWithProgress.filter(
      order => order.expectedCompletionDate && new Date(order.expectedCompletionDate) < today
    );
    
    // Completion forecast (on track vs delayed)
    const onTrackCount = ordersWithProgress.length - delayedOrders.length;
    
    res.json({
      success: true,
      tracking: {
        activeOrders: ordersWithProgress,
        delayedOrders,
        summary: {
          totalActive: ordersWithProgress.length,
          onTrack: onTrackCount,
          delayed: delayedOrders.length,
        },
      },
    });
  } catch (error) {
    console.error('Get order completion tracking error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get beam consumption report
 * @route   GET /api/weaving/analytics/beam-consumption
 * @access  Private (Viewer+)
 */
const getBeamConsumptionReport = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Total beams by status
    const beamsByStatus = await Beam.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalLength: { $sum: '$totalLength' },
          remainingLength: { $sum: '$remainingLength' },
        },
      },
    ]);
    
    // Beam usage tracking
    const beamUsage = await Beam.find({ company: companyObjectId })
      .select('beamNumber qualityName totalLength remainingLength status')
      .lean();
    
    const beamUsageWithPercent = beamUsage.map(beam => ({
      ...beam,
      usedPercent: (((beam.totalLength - beam.remainingLength) / beam.totalLength) * 100).toFixed(2),
      usedLength: beam.totalLength - beam.remainingLength,
    }));
    
    res.json({
      success: true,
      beamReport: {
        statusDistribution: beamsByStatus,
        beamUsage: beamUsageWithPercent,
      },
    });
  } catch (error) {
    console.error('Get beam consumption report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get maintenance cost analysis
 * @route   GET /api/weaving/analytics/maintenance-cost
 * @access  Private (Viewer+)
 */
const getMaintenanceCostAnalysis = async (req, res) => {
  try {
    const { period = '180' } = req.query; // Default 6 months
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Monthly cost trend
    const monthlyCost = await LoomMaintenance.aggregate([
      {
        $match: {
          company: companyObjectId,
          actualDate: { $gte: startDate },
          status: 'Completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$actualDate' },
            month: { $month: '$actualDate' },
          },
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    
    // Cost by maintenance type
    const costByType = await LoomMaintenance.aggregate([
      {
        $match: {
          company: companyObjectId,
          actualDate: { $gte: startDate },
          status: 'Completed',
        },
      },
      {
        $group: {
          _id: '$maintenanceType',
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
          avgCost: { $avg: '$totalCost' },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);
    
    // Loom-wise maintenance cost
    const costByLoom = await LoomMaintenance.aggregate([
      {
        $match: {
          company: companyObjectId,
          actualDate: { $gte: startDate },
          status: 'Completed',
        },
      },
      {
        $group: {
          _id: '$loomId',
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);
    
    // Populate loom details
    await LoomMaintenance.populate(costByLoom, {
      path: '_id',
      select: 'loomNumber loomType',
    });
    
    res.json({
      success: true,
      maintenanceAnalysis: {
        monthlyCost,
        costByType,
        costByLoom,
      },
    });
  } catch (error) {
    console.error('Get maintenance cost analysis error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getWeavingDashboard,
  getLoomStatusDistribution,
  getProductionTrend,
  getLoomEfficiencyComparison,
  getShiftProduction,
  getDefectTrend,
  getTopPerformingLooms,
  getOrderCompletionTracking,
  getBeamConsumptionReport,
  getMaintenanceCostAnalysis,
};