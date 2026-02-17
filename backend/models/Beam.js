const mongoose = require('mongoose');

const beamSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    beamNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    beamType: {
      type: String,
      enum: ['Warp Beam', 'Weaver\'s Beam'],
      required: true,
    },
    qualityName: {
      type: String,
      required: [true, 'Quality name is required'],
      trim: true,
    },
    estimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate',
      default: null,
    },
    
    // Yarn specifications (snapshot from estimate)
    yarnDetails: {
      warpYarn: {
        yarnId: mongoose.Schema.Types.ObjectId,
        yarnName: String,
        displayName: String,
        denier: Number,
      },
    },
    
    // Beam specifications
    tar: {
      type: Number,
      required: [true, 'Tar (Ends) is required'],
      min: [1, 'Tar must be greater than 0'],
    },
    denier: {
      type: Number,
      required: [true, 'Denier is required'],
      min: [1, 'Denier must be greater than 0'],
    },
    totalLength: {
      type: Number,
      required: [true, 'Total length is required'],
      min: [1, 'Total length must be greater than 0'],
    },
    lengthUnit: {
      type: String,
      enum: ['meters', 'yards'],
      default: 'meters',
    },
    remainingLength: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Calculated fields (using utility functions)
    beamWeight: {
      raw: { type: Number, default: 0 },
      formatted: { type: Number, default: 0 },
    },
    
    preparationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Ready', 'On Loom', 'Exhausted', 'Damaged'],
      default: 'Ready',
      index: true,
    },
    currentLoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loom',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
beamSchema.index({ company: 1, beamNumber: 1 }, { unique: true });
beamSchema.index({ company: 1, status: 1 });
beamSchema.index({ company: 1, qualityName: 1 });
beamSchema.index({ company: 1, estimateId: 1 });

// Virtual for usage percentage
beamSchema.virtual('usagePercent').get(function () {
  if (this.totalLength === 0) return 0;
  return ((this.totalLength - this.remainingLength) / this.totalLength) * 100;
});

// Virtual for is exhausted
beamSchema.virtual('isExhausted').get(function () {
  return this.remainingLength === 0;
});

// Ensure virtuals are included
beamSchema.set('toJSON', { virtuals: true });
beamSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Beam', beamSchema);