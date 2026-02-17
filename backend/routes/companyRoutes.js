// backend/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createCompany,
  joinCompany,
  getUserCompanies,
  getCompanyDetails,
  updateCompany,
  regenerateCompanyCode,
  leaveCompany,
  deleteCompany
} = require('../controllers/companyController');

// All routes require authentication
router.use(protect);

// Basic company operations (no RBAC needed)
router.post('/', createCompany);
router.post('/join', joinCompany);
router.get('/', getUserCompanies);
router.get('/:companyId', getCompanyDetails);
router.put('/:companyId', updateCompany);
router.post('/:companyId/regenerate-code', regenerateCompanyCode);
router.post('/:companyId/leave', leaveCompany);
router.delete('/:companyId', deleteCompany);

module.exports = router;