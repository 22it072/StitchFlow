const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getParties,
  getParty,
  createParty,
  updateParty,
  deleteParty,
  getPartyStats,
} = require('../controllers/partyController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCompanyMembership, requirePermission } = require('../middleware/rbacMiddleware');

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

// Stats route
router.get('/stats', requirePermission('production:view'), getPartyStats);

// View routes
router.get('/', requirePermission('production:view'), getParties);
router.get('/:id', requirePermission('production:view'), getParty);

// Create route
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('partyName').trim().notEmpty().withMessage('Party name is required'),
    body('paymentTermsDays').optional().isNumeric().withMessage('Payment terms must be a number'),
    body('interestPercentPerDay').optional().isNumeric().withMessage('Interest rate must be a number'),
    body('creditLimit').optional().isNumeric().withMessage('Credit limit must be a number'),
  ],
  validate,
  createParty
);

// Update route
router.put('/:id', requirePermission('production:edit'), updateParty);

// Delete route
router.delete('/:id', requirePermission('production:delete'), deleteParty);

module.exports = router;