// backend/routes/estimateRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  duplicateEstimate,
  revertVersion,
  compareEstimates,
  saveDraft,
  getDraft,
  deleteDraft,
  calculate,
  migrateEstimates,
} = require('../controllers/estimateController');
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

// Draft routes - require estimates:create permission
router.get('/draft', requirePermission('estimates:create'), getDraft);
router.post('/draft', requirePermission('estimates:create'), saveDraft);
router.delete('/draft', requirePermission('estimates:create'), deleteDraft);

// Calculate route - require estimates:view (preview only)
router.post('/calculate', requirePermission('estimates:view'), calculate);

// Compare route - require estimates:view permission
router.post('/compare', requirePermission('estimates:view'), compareEstimates);

// Migration route - require admin permission
router.post('/migrate', requirePermission('company:settings'), migrateEstimates);

// View routes - require estimates:view permission
router.get('/', requirePermission('estimates:view'), getEstimates);
router.get('/:id', requirePermission('estimates:view'), getEstimate);

// Create route - require estimates:create permission
router.post(
  '/',
  requirePermission('estimates:create'),
  [
    body('qualityName').trim().notEmpty().withMessage('Quality name is required'),
    body('warp.tar').isNumeric().withMessage('Warp tar is required'),
    body('warp.denier').isNumeric().withMessage('Warp denier is required'),
    body('warp.wastage').isNumeric().withMessage('Warp wastage is required'),
    body('weft.peek').isNumeric().withMessage('Weft peek is required'),
    body('weft.panna').isNumeric().withMessage('Weft panna is required'),
    body('weft.denier').isNumeric().withMessage('Weft denier is required'),
    body('weft.wastage').isNumeric().withMessage('Weft wastage is required'),
  ],
  validate,
  createEstimate
);

// Update route - require estimates:edit permission
router.put('/:id', requirePermission('estimates:edit'), updateEstimate);

// Delete route - require estimates:delete permission (Admin only)
router.delete('/:id', requirePermission('estimates:delete'), deleteEstimate);

// Duplicate route - require estimates:duplicate permission
router.post('/:id/duplicate', requirePermission('estimates:duplicate'), duplicateEstimate);

// Revert route - require estimates:edit permission
router.post('/:id/revert/:version', requirePermission('estimates:edit'), revertVersion);

module.exports = router;