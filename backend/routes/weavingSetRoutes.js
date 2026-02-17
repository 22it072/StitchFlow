const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getWeavingSets,
  getWeavingSet,
  createWeavingSet,
  updateWeavingSet,
  updateSetStatus,
  deleteWeavingSet,
  getSetStats,
} = require('../controllers/weavingSetController');
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

// Stats route - require weaving:view permission
router.get('/stats', requirePermission('production:view'), getSetStats);

// View routes - require weaving:view permission
router.get('/', requirePermission('production:view'), getWeavingSets);
router.get('/:id', requirePermission('production:view'), getWeavingSet);

// Create route - require weaving:create permission
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('qualityName').trim().notEmpty().withMessage('Quality name is required'),
    body('partyId').trim().notEmpty().withMessage('Party is required'),
    body('orderQuantity').isNumeric().withMessage('Order quantity must be a number'),
  ],
  validate,
  createWeavingSet
);

// Update route - require weaving:edit permission
router.put('/:id', requirePermission('production:edit'), updateWeavingSet);

// Update status route - require weaving:edit permission
router.put('/:id/status', requirePermission('production:edit'), updateSetStatus);

// Delete route - require weaving:delete permission (Admin only)
router.delete('/:id', requirePermission('production:delete'), deleteWeavingSet);

module.exports = router;