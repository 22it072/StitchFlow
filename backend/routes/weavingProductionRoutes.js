const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getProductionEntries,
  getProductionEntry,
  createProductionEntry,
  updateProductionEntry,
  deleteProductionEntry,
  getTodayProduction,
  getProductionStats,
} = require('../controllers/weavingProductionController');
const { protect } = require('../middleware/authMiddleware');
const { 
  verifyCompanyMembership, 
  requirePermission 
} = require('../middleware/rbacMiddleware');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// All routes require authentication and company membership
router.use(protect);
router.use(verifyCompanyMembership);

// Stats routes - require weaving:view permission
router.get('/stats', requirePermission('production:view'), getProductionStats);
router.get('/today', requirePermission('production:view'), getTodayProduction);

// View routes - require weaving:view permission
router.get('/', requirePermission('production:view'), getProductionEntries);
router.get('/:id', requirePermission('production:view'), getProductionEntry);

// Create route - require weaving:create permission (operators can create)
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('loomId').trim().notEmpty().withMessage('Loom is required'),
    body('setId').trim().notEmpty().withMessage('Set is required'),
    body('operatorName').trim().notEmpty().withMessage('Operator name is required'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('metersProduced').isNumeric().withMessage('Meters produced must be a number'),
  ],
  validate,
  createProductionEntry
);

// Update route - require weaving:edit permission (supervisors can edit)
router.put('/:id', requirePermission('production:edit'), updateProductionEntry);

// Delete route - require weaving:delete permission (Admin only)
router.delete('/:id', requirePermission('production:delete'), deleteProductionEntry);

module.exports = router;