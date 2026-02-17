// backend/routes/productionRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createProduction,
  getProductions,
  getProductionById,
  calculateProductionPreview,
  updateProduction,
  deleteProduction,
  getProductionStats,
  getProductionAnalytics
} = require('../controllers/productionController');

// All routes are protected
router.use(protect);

// Statistics and analytics routes (must be before :id routes)
router.get('/stats', getProductionStats);
router.get('/analytics', getProductionAnalytics);

// Calculate preview (without saving)
router.post('/calculate', calculateProductionPreview);

// CRUD routes
router.route('/')
  .get(getProductions)
  .post(createProduction);

router.route('/:id')
  .get(getProductionById)
  .put(updateProduction)
  .delete(deleteProduction);

module.exports = router;