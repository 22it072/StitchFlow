const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/weavingAnalyticsController');
const { protect } = require('../middleware/authMiddleware');
const { 
  verifyCompanyMembership, 
  requirePermission 
} = require('../middleware/rbacMiddleware');

// All routes require authentication and company membership
router.use(protect);
router.use(verifyCompanyMembership);

// All analytics routes require analytics:view permission
router.get('/dashboard', requirePermission('analytics:view'), getWeavingDashboard);
router.get('/loom-status', requirePermission('analytics:view'), getLoomStatusDistribution);
router.get('/production-trend', requirePermission('analytics:view'), getProductionTrend);
router.get('/loom-efficiency', requirePermission('analytics:view'), getLoomEfficiencyComparison);
router.get('/shift-production', requirePermission('analytics:view'), getShiftProduction);
router.get('/defect-trend', requirePermission('analytics:view'), getDefectTrend);
router.get('/top-looms', requirePermission('analytics:view'), getTopPerformingLooms);
router.get('/order-completion', requirePermission('analytics:view'), getOrderCompletionTracking);
router.get('/beam-consumption', requirePermission('analytics:view'), getBeamConsumptionReport);
router.get('/maintenance-cost', requirePermission('analytics:view'), getMaintenanceCostAnalysis);

module.exports = router;