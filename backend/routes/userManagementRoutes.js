// backend/routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCompanyUsers,
  getUserStats,
  changeUserRole,
  removeUser,
  transferOwnership
} = require('../controllers/userManagementController');

// All routes require authentication
router.use(protect);

// User management routes
router.get('/:companyId/users', getCompanyUsers);
router.get('/:companyId/users/stats', getUserStats);
router.put('/:companyId/users/:userId/role', changeUserRole);
router.delete('/:companyId/users/:userId', removeUser);
router.post('/:companyId/transfer-ownership', transferOwnership);

module.exports = router;