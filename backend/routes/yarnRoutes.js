// backend/routes/yarnRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getYarns,
  getYarn,
  createYarn,
  updateYarn,
  deleteYarn,
  incrementUsage,
  getYarnStats,
} = require('../controllers/yarnController');
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

// View routes - require yarns:view permission
router.get('/stats', requirePermission('yarns:view'), getYarnStats);
router.get('/', requirePermission('yarns:view'), getYarns);
router.get('/:id', requirePermission('yarns:view'), getYarn);

// Create route - require yarns:create permission
router.post(
  '/',
  requirePermission('yarns:create'),
  [
    body('name').trim().notEmpty().withMessage('Yarn name is required'),
    body('denier').isNumeric().withMessage('Denier must be a number'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('gstPercentage').isNumeric().withMessage('GST must be a number'),
    body('yarnType').isIn(['warp', 'weft', 'weft-2', 'all']).withMessage('Invalid yarn type'),
    body('yarnCategory').isIn(['spun', 'filament']).withMessage('Invalid yarn category'),
  ],
  validate,
  createYarn
);

// Update route - require yarns:edit permission
router.put('/:id', requirePermission('yarns:edit'), updateYarn);

// Delete route - require yarns:delete permission (Admin only)
router.delete('/:id', requirePermission('yarns:delete'), deleteYarn);

// Usage increment - require yarns:edit permission
router.post('/:id/usage', requirePermission('yarns:edit'), incrementUsage);

module.exports = router;