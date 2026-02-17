const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getBeams,
  getBeam,
  createBeam,
  updateBeam,
  updateBeamRemaining,
  deleteBeam,
  getBeamStats,
  getAvailableBeams,
} = require('../controllers/beamController');
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
router.get('/stats', requirePermission('production:view'), getBeamStats);

// Available beams for allocation - require weaving:view permission
router.get('/available', requirePermission('production:view'), getAvailableBeams);

// View routes - require weaving:view permission
router.get('/', requirePermission('production:view'), getBeams);
router.get('/:id', requirePermission('production:view'), getBeam);

// Create route - require weaving:create permission
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('beamType').trim().notEmpty().withMessage('Beam type is required'),
    body('qualityName').trim().notEmpty().withMessage('Quality name is required'),
    body('tar').isNumeric().withMessage('Tar (ends) must be a number'),
    body('denier').isNumeric().withMessage('Denier must be a number'),
    body('totalLength').isNumeric().withMessage('Total length must be a number'),
  ],
  validate,
  createBeam
);

// Update route - require weaving:edit permission
router.put('/:id', requirePermission('production:edit'), updateBeam);

// Update remaining length route - require weaving:edit permission
router.put('/:id/remaining', requirePermission('production:edit'), updateBeamRemaining);

// Delete route - require weaving:delete permission (Admin only)
router.delete('/:id', requirePermission('production:delete'), deleteBeam);

module.exports = router;