const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
    },
    // Calculation Settings
    defaultGstPercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    defaultWastage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    weightDecimalPrecision: {
      type: Number,
      default: 4,
      min: 1,
      max: 6,
    },
    costDecimalPrecision: {
      type: Number,
      default: 2,
      min: 1,
      max: 4,
    },
    // Behavior Settings
    enableWeft2ByDefault: {
      type: Boolean,
      default: false,
    },
    autoSaveInterval: {
      type: Number,
      default: 30,
      min: 10,
      max: 300,
    },
    // Display Settings
    currencySymbol: {
      type: String,
      default: '₹',
    },
    currencyCode: {
      type: String,
      default: 'INR',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to ensure defaults
settingsSchema.pre('save', function(next) {
  if (this.defaultWastage === undefined || this.defaultWastage === null) {
    this.defaultWastage = 10;
  }
  if (this.defaultGstPercentage === undefined || this.defaultGstPercentage === null) {
    this.defaultGstPercentage = 5;
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);