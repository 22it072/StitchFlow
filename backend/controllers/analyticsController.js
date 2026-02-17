const Estimate = require('../models/Estimate');
const Yarn = require('../models/Yarn');
const mongoose = require('mongoose');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }

    // Get total counts
    const totalEstimates = await Estimate.countDocuments({ company: companyId, user: userId });
    const totalYarns = await Yarn.countDocuments({ company: companyId, user: userId });

    // Get aggregated data
    const estimateStats = await Estimate.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      {
        $group: {
          _id: null,
          avgCost: { $avg: '$totalCost' },
          totalWeight: { $sum: '$totalWeight' },
          minCost: { $min: '$totalCost' },
          maxCost: { $max: '$totalCost' },
        },
      },
    ]);

    // Get recent estimates
    const recentEstimates = await Estimate.find({ company: companyId, user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('qualityName totalWeight totalCost createdAt');

    // Get yarn usage stats
    const yarnUsageStats = await Yarn.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          totalUsage: { $sum: '$usageCount' },
        },
      },
    ]);

    // Get most used yarns
    const mostUsedYarns = await Yarn.find({ company: companyId, user: userId })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('name usageCount price yarnType');

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Estimate.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          user: userId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          avgCost: { $avg: '$totalCost' },
          totalCost: { $sum: '$totalCost' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          totalEstimates,
          totalYarns,
        },
        estimateStats: estimateStats[0] || {
          avgCost: 0,
          totalWeight: 0,
          minCost: 0,
          maxCost: 0,
        },
        yarnStats: yarnUsageStats[0] || {
          avgPrice: 0,
          totalUsage: 0,
        },
        recentEstimates,
        mostUsedYarns,
        monthlyTrends,
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get yarn usage analytics
// @route   GET /api/analytics/yarn-usage
// @access  Private
const getYarnUsageAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }

    // Usage by yarn type
    const usageByType = await Yarn.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      {
        $group: {
          _id: '$yarnType',
          count: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    // Top yarns by usage
    const topYarns = await Yarn.find({ company: companyId, user: userId })
      .sort({ usageCount: -1 })
      .limit(10)
      .select('name usageCount price gstPercentage yarnType');

    // Price distribution
    const priceDistribution = await Yarn.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 100, 200, 300, 400, 500, 1000, 2000],
          default: '2000+',
          output: {
            count: { $sum: 1 },
            yarns: { $push: '$name' },
          },
        },
      },
    ]);

    // Cost impact analysis
    const costImpact = await Estimate.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(companyId), user: userId } },
      { $unwind: '$warp' },
      {
        $group: {
          _id: '$warp.yarnName',
          avgCostContribution: { $avg: '$warp.formattedCost' },
          totalEstimates: { $sum: 1 },
        },
      },
      { $sort: { avgCostContribution: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        usageByType,
        topYarns,
        priceDistribution,
        costImpact,
      }
    });
  } catch (error) {
    console.error('Yarn usage analytics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching yarn usage analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get cost trends
// @route   GET /api/analytics/cost-trends
// @access  Private
const getCostTrends = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.headers['x-company-id'] || req.user.activeCompanyId;
    const { period = '6months' } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'No active company selected'
      });
    }

    let startDate = new Date();
    switch (period) {
      case '1month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    const trends = await Estimate.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
          user: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            week: { $week: '$createdAt' },
          },
          avgCost: { $avg: '$totalCost' },
          avgWeight: { $avg: '$totalWeight' },
          count: { $sum: 1 },
          minCost: { $min: '$totalCost' },
          maxCost: { $max: '$totalCost' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
    ]);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Cost trends error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching cost trends',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getYarnUsageAnalytics,
  getCostTrends,
};