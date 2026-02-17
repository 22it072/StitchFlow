const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getLooms,
  getLoom,
  createLoom,
  updateLoom,
  updateLoomStatus,
  deleteLoom,
  getLoomStats,
  getAvailableLooms,
} = require('../controllers/loomController');
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
router.get('/stats', requirePermission('production:view'), getLoomStats);

// Available looms for allocation - require weaving:view permission
router.get('/available', requirePermission('production:view'), getAvailableLooms);

// View routes - require weaving:view permission
router.get('/', requirePermission('production:view'), getLooms);
router.get('/:id', requirePermission('production:view'), getLoom);

// Create route - require weaving:create permission
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('loomType').trim().notEmpty().withMessage('Loom type is required'),
    body('reedWidth').isNumeric().withMessage('Reed width must be a number'),
    body('rpm').isNumeric().withMessage('RPM must be a number'),
  ],
  validate,
  createLoom
);

// Update route - require weaving:edit permission
router.put('/:id', requirePermission('production:edit'), updateLoom);

// Update status route - require weaving:edit permission (operators can update status)
router.put('/:id/status', requirePermission('production:edit'), updateLoomStatus);

// Delete route - require weaving:delete permission (Admin only)
router.delete('/:id', requirePermission('production:delete'), deleteLoom);

module.exports = router;