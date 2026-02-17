const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  getChallans,
  getChallan,
  createChallan,
  updateChallanStatus,
  recordPayment,
  getChallanStats,
  deleteChallan,
} = require('../controllers/challanController');
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
router.get('/stats', requirePermission('production:view'), getChallanStats);

// View routes
router.get('/', requirePermission('production:view'), getChallans);
router.get('/:id', requirePermission('production:view'), getChallan);

// Create route
router.post(
  '/',
  requirePermission('production:create'),
  [
    body('partyId').notEmpty().withMessage('Party is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.estimateId').notEmpty().withMessage('Estimate ID is required for each item'),
    body('items.*.orderedMeters').isNumeric().withMessage('Ordered meters must be a number'),
  ],
  validate,
  createChallan
);

// Update status
router.put('/:id/status', requirePermission('production:edit'), updateChallanStatus);

// Record payment
router.post(
  '/:id/payment',
  requirePermission('production:edit'),
  [
    body('amount').isNumeric().withMessage('Amount is required'),
    body('method').optional().trim(),
  ],
  validate,
  recordPayment
);

// Delete route
router.delete('/:id', requirePermission('production:delete'), deleteChallan);

module.exports = router;