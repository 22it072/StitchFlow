const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  resetSettings,
  migrateSettings,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);
router.post('/migrate', migrateSettings);

module.exports = router;