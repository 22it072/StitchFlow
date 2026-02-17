const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getMaintenanceRecords,
  getMaintenanceRecord,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord,
  getMaintenanceStats,
  getMaintenanceAlerts,
} = require('../controllers/maintenanceController');
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

// Stats and alerts routes - require weaving:view permission
router.get('/stats', requirePermission('production:view'), getMaintenanceStats);
router.get('/alerts', requirePermission('production:view'), getMaintenanceAlerts);

// View routes - require weaving:view permission
router.get('/', requirePermission('production:view'), getMaintenanceRecords);
router.get('/:id', requirePermission('production:view'), getMaintenanceRecord);

// Create route - require weaving:create permission
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('loomId').trim().notEmpty().withMessage('Loom is required'),
    body('maintenanceType').trim().notEmpty().withMessage('Maintenance type is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  ],
  validate,
  createMaintenanceRecord
);

// Update route - require weaving:edit permission
router.put('/:id', requirePermission('production:edit'), updateMaintenanceRecord);

// Update status route - require weaving:edit permission
router.put('/:id/status', requirePermission('production:edit'), updateMaintenanceStatus);

// Delete route - require weaving:delete permission (Admin only)
router.delete('/:id', requirePermission('production:delete'), deleteMaintenanceRecord);

module.exports = router;