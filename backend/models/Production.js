// backend/models/Production.js
const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  // UPDATED: Add company field for multi-tenancy
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  
  // Link to existing estimate (optional)
  estimateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estimate',
    default: null
  },
  
  // Quality/Fabric Information
  qualityName: {
    type: String,
    required: [true, 'Quality name is required'],
    trim: true,
    maxlength: [100, 'Quality name cannot exceed 100 characters']
  },
  
  // Loom Parameters
  loomParams: {
    rpm: {
      type: Number,
      required: [true, 'RPM is required'],
      min: [1, 'RPM must be greater than 0']
    },
    pick: {
      type: Number,
      required: [true, 'Pick (PPI) is required'],
      min: [1, 'Pick must be greater than 0']
    },
    efficiency: {
      type: Number,
      required: [true, 'Efficiency is required'],
      min: [0, 'Efficiency cannot be negative'],
      max: [100, 'Efficiency cannot exceed 100%']
    },
    machines: {
      type: Number,
      required: [true, 'Number of machines is required'],
      min: [1, 'At least 1 machine is required']
    },
    workingHours: {
      type: Number,
      required: [true, 'Working hours is required'],
      min: [0.5, 'Working hours must be at least 0.5'],
      max: [24, 'Working hours cannot exceed 24']
    }
  },
  
  // Calculated Values
  calculations: {
    rawPicksPerDay: {
      type: Number,
      required: true
    },
    rawProductionMeters: {
      type: Number,
      required: true
    },
    formattedProduction: {
      type: Number,
      required: true
    },
    formattedScale: {
      type: Number,
      required: true
    },
    magnitude: {
      type: Number,
      required: true
    },
    monthlyProduction: {
      raw: { type: Number },
      formatted: { type: Number },
      scale: { type: Number },
      workingDays: { type: Number, default: 26 }
    }
  },
  
  // Optional reference data from estimate
  referenceData: {
    panna: { type: Number },
    reedSpace: { type: Number },
    warpCount: { type: String },
    weftCount: { type: String }
  },
  
  // Metadata
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// UPDATED: Compound indexes for company-scoped queries
productionSchema.index({ company: 1, user: 1, createdAt: -1 });
productionSchema.index({ company: 1, qualityName: 'text' });
productionSchema.index({ company: 1, estimateId: 1 });
productionSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Production', productionSchema);