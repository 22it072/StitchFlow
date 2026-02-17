// backend/models/Yarn.js
const mongoose = require('mongoose');

const yarnSchema = new mongoose.Schema(
  {
    // UPDATED: Add company field for multi-tenancy
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
    name: {
      type: String,
      required: [true, 'Please add a yarn name'],
      trim: true,
    },
    denier: {
      type: Number,
      required: [true, 'Please add denier value'],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, 'Please add yarn price'],
      min: 0,
    },
    gstPercentage: {
      type: Number,
      required: [true, 'Please add GST percentage'],
      default: 5,
      min: 0,
      max: 100,
    },
    yarnType: {
      type: String,
      required: [true, 'Please select yarn type'],
      enum: ['warp', 'weft', 'weft-2', 'all'],
    },
    yarnCategory: {
      type: String,
      required: [true, 'Please select yarn category'],
      enum: ['spun', 'filament'],
      default: 'spun',
    },
    tpm: {
      type: Number,
      min: 0,
      default: null,
    },
    filamentCount: {
      type: Number,
      min: 0,
      default: null,
    },
    displayName: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for price with GST
yarnSchema.virtual('priceWithGst').get(function () {
  return this.price + (this.price * this.gstPercentage) / 100;
});

// Pre-save middleware to generate display name
yarnSchema.pre('save', function (next) {
  this.displayName = generateYarnDisplayName(this);
  next();
});

// Static method to generate display name
function generateYarnDisplayName(yarn) {
  const { name, denier, yarnCategory, tpm, filamentCount } = yarn;
  
  if (!name || !denier) return name || '';
  
  let displayName = name;
  
  if (yarnCategory === 'filament') {
    if (filamentCount) {
      displayName = `${name} ${denier}/${filamentCount}`;
      if (tpm) {
        displayName = `${name} ${denier}/${filamentCount} TPM ${tpm}`;
      }
    } else {
      displayName = `${name} ${denier}D`;
    }
  } else {
    if (tpm) {
      displayName = `${name} ${denier}/${tpm}`;
    } else {
      displayName = `${name} ${denier}D`;
    }
  }
  
  return displayName;
}

yarnSchema.statics.generateDisplayName = generateYarnDisplayName;

// Ensure virtuals are included in JSON
yarnSchema.set('toJSON', { virtuals: true });
yarnSchema.set('toObject', { virtuals: true });

// UPDATED: Compound index for company-scoped queries
yarnSchema.index({ company: 1, user: 1 });
yarnSchema.index({ company: 1, name: 'text', displayName: 'text' });
yarnSchema.index({ company: 1, yarnType: 1 });
yarnSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('Yarn', yarnSchema);