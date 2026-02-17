const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getYarnUsageAnalytics,
  getCostTrends,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardAnalytics);
router.get('/yarn-usage', getYarnUsageAnalytics);
router.get('/cost-trends', getCostTrends);

module.exports = router;