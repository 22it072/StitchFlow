const Settings = require('../models/Settings');

// Default values - keep in sync with model
const DEFAULTS = {
  defaultGstPercentage: 5,
  defaultWastage: 10,
  weightDecimalPrecision: 4,
  costDecimalPrecision: 2,
  enableWeft2ByDefault: false,
  autoSaveInterval: 30,
  currencySymbol: '₹',
  currencyCode: 'INR',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
};

// Helper function to ensure all fields have values
const ensureDefaults = (settings) => {
  const result = { ...DEFAULTS };
  
  if (settings) {
    Object.keys(DEFAULTS).forEach(key => {
      if (settings[key] !== undefined && settings[key] !== null) {
        result[key] = settings[key];
      }
    });
    
    // Include MongoDB fields
    if (settings._id) result._id = settings._id;
    if (settings.user) result.user = settings.user;
    if (settings.createdAt) result.createdAt = settings.createdAt;
    if (settings.updatedAt) result.updatedAt = settings.updatedAt;
  }
  
  return result;
};

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    if (!settings) {
      // Create new settings with all defaults
      settings = await Settings.create({ 
        user: req.user._id,
        ...DEFAULTS 
      });
    } else {
      // Check if any new fields are missing and update
      let needsUpdate = false;
      const updates = {};
      
      Object.keys(DEFAULTS).forEach(key => {
        if (settings[key] === undefined || settings[key] === null) {
          updates[key] = DEFAULTS[key];
          needsUpdate = true;
        }
      });
      
      // If there are missing fields, update the document
      if (needsUpdate) {
        console.log('Updating settings with missing fields:', updates);
        settings = await Settings.findOneAndUpdate(
          { user: req.user._id },
          { $set: updates },
          { new: true }
        );
      }
    }

    // Ensure response has all fields
    const response = ensureDefaults(settings.toObject());
    
    console.log('Returning settings:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    console.log('Received update request:', req.body);

    const {
      defaultGstPercentage,
      defaultWastage,
      weightDecimalPrecision,
      costDecimalPrecision,
      enableWeft2ByDefault,
      currencySymbol,
      currencyCode,
      dateFormat,
      autoSaveInterval,
      theme,
    } = req.body;

    // Build update object - only include fields that were sent
    const updateData = {};
    
    if (defaultGstPercentage !== undefined) {
      updateData.defaultGstPercentage = Number(defaultGstPercentage);
    }
    if (defaultWastage !== undefined) {
      updateData.defaultWastage = Number(defaultWastage);
    }
    if (weightDecimalPrecision !== undefined) {
      updateData.weightDecimalPrecision = Number(weightDecimalPrecision);
    }
    if (costDecimalPrecision !== undefined) {
      updateData.costDecimalPrecision = Number(costDecimalPrecision);
    }
    if (enableWeft2ByDefault !== undefined) {
      updateData.enableWeft2ByDefault = Boolean(enableWeft2ByDefault);
    }
    if (currencySymbol !== undefined) {
      updateData.currencySymbol = String(currencySymbol);
    }
    if (currencyCode !== undefined) {
      updateData.currencyCode = String(currencyCode);
    }
    if (dateFormat !== undefined) {
      updateData.dateFormat = String(dateFormat);
    }
    if (autoSaveInterval !== undefined) {
      updateData.autoSaveInterval = Number(autoSaveInterval);
    }
    if (theme !== undefined) {
      updateData.theme = String(theme);
    }

    console.log('Update data:', updateData);

    // Use findOneAndUpdate with upsert to create if doesn't exist
    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      { 
        $set: updateData,
        $setOnInsert: { user: req.user._id }
      },
      { 
        new: true,        // Return updated document
        upsert: true,     // Create if doesn't exist
        runValidators: true 
      }
    );

    // Ensure response has all fields with defaults
    const response = ensureDefaults(settings.toObject());
    
    console.log('Saved and returning settings:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset settings to defaults
// @route   POST /api/settings/reset
// @access  Private
const resetSettings = async (req, res) => {
  try {
    // Delete existing and create new with all defaults
    await Settings.findOneAndDelete({ user: req.user._id });
    
    const settings = await Settings.create({ 
      user: req.user._id,
      ...DEFAULTS 
    });
    
    const response = ensureDefaults(settings.toObject());
    
    console.log('Reset settings:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Migrate settings - add missing fields to existing settings
// @route   POST /api/settings/migrate
// @access  Private
const migrateSettings = async (req, res) => {
  try {
    const result = await Settings.updateMany(
      { defaultWastage: { $exists: false } },
      { $set: { defaultWastage: DEFAULTS.defaultWastage } }
    );
    
    console.log('Migration result:', result);
    
    res.json({ 
      message: 'Migration complete', 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
  migrateSettings,
};