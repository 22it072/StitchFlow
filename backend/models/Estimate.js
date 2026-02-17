const mongoose = require('mongoose');

const estimateSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    qualityName: {
      type: String,
      required: [true, 'Please add a quality/cloth name'],
      trim: true,
    },
    
    warp: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    weft: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    weft2Enabled: {
      type: Boolean,
      default: false,
    },
    weft2: {
      type: mongoose.Schema.Types.Mixed,
    },
    
    otherCostPerMeter: {
      type: Number,
      default: 0,
    },
    
    // Net Weights (NEW)
    netWeights: {
      warp: { type: Number, default: 0 },
      weft: { type: Number, default: 0 },
      weft2: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    
    // Wastage Weights (NEW)
    wastageWeights: {
      warp: { type: Number, default: 0 },
      weft: { type: Number, default: 0 },
      weft2: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    
    // Legacy totals (kept for compatibility)
    totalNetWeight: {
      type: Number,
      default: 0,
    },
    totalWeight: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    
    notes: String,
    tags: [String],
    
    versions: [{
      versionNumber: Number,
      data: mongoose.Schema.Types.Mixed,
      editedAt: { type: Date, default: Date.now },
      editedBy: String,
    }],
    currentVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

estimateSchema.index({ company: 1, user: 1 });
estimateSchema.index({ company: 1, qualityName: 'text', notes: 'text' });
estimateSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Estimate', estimateSchema);