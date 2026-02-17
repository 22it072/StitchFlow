const mongoose = require('mongoose');

const weavingSetSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    setNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    setDate: {
      type: Date,
      default: Date.now,
    },
    
    // Links
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
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
      index: true,
    },
    
    // Production requirements
    orderQuantity: {
      type: Number,
      required: [true, 'Order quantity is required'],
      min: [1, 'Order quantity must be greater than 0'],
    },
    quantityUnit: {
      type: String,
      enum: ['meters', 'yards', 'pieces'], // Added 'pieces'
      default: 'meters',
    },
    producedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Loom & Beam allocation
    allocatedLoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loom',
      default: null,
    },
    allocatedBeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beam',
      default: null,
    },
    
    // Production planning
    targetMetersPerDay: {
      type: Number,
      min: 0,
      default: 0,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'], // Added 'Urgent'
      default: 'Medium',
    },
    startDate: {
      type: Date,
      default: null,
    },
    expectedCompletionDate: {
      type: Date,
      default: null,
    },
    actualCompletionDate: {
      type: Date,
      default: null,
    },
    
    // Weaving specifications (snapshot from estimate)
    weavingSpecs: {
      weftYarn1: {
        yarnId: mongoose.Schema.Types.ObjectId,
        yarnName: String,
        displayName: String,
        denier: Number,
      },
      weftYarn2: {
        yarnId: mongoose.Schema.Types.ObjectId,
        yarnName: String,
        displayName: String,
        denier: Number,
      },
      reed: Number,
      pick: Number,
      panna: Number,
      width: Number,
      targetGSM: Number,
    },
    
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
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
weavingSetSchema.index({ company: 1, setNumber: 1 }, { unique: true });
weavingSetSchema.index({ company: 1, status: 1 });
weavingSetSchema.index({ company: 1, partyId: 1 });
weavingSetSchema.index({ company: 1, priority: 1 });

// Virtual for completion percentage
weavingSetSchema.virtual('completionPercent').get(function () {
  if (this.orderQuantity === 0) return 0;
  return (this.producedQuantity / this.orderQuantity) * 100;
});

// Virtual for remaining quantity
weavingSetSchema.virtual('remainingQuantity').get(function () {
  return Math.max(0, this.orderQuantity - this.producedQuantity);
});

// Pre-save hook to calculate expected completion date
weavingSetSchema.pre('save', function (next) {
  if (this.isModified('startDate') || this.isModified('targetMetersPerDay') || this.isModified('orderQuantity')) {
    if (this.startDate && this.targetMetersPerDay > 0) {
      const remainingQty = this.orderQuantity - (this.producedQuantity || 0);
      const daysRequired = Math.ceil(remainingQty / this.targetMetersPerDay);
      const expectedDate = new Date(this.startDate);
      expectedDate.setDate(expectedDate.getDate() + daysRequired);
      this.expectedCompletionDate = expectedDate;
    }
  }
  next();
});

// Ensure virtuals are included
weavingSetSchema.set('toJSON', { virtuals: true });
weavingSetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WeavingSet', weavingSetSchema);