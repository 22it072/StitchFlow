const mongoose = require('mongoose');

const challanItemSchema = new mongoose.Schema({
  estimateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estimate',
    required: true,
  },
  // SNAPSHOT fields (frozen from estimate at time of challan creation)
  qualityName: {
    type: String,
    required: true,
  },
  panna: {
    type: Number,
    required: true,
  },
  pricePerMeter: {
    type: Number,
    required: true,
    min: 0,
  },
  weightPerMeter: {
    type: Number,
    required: true,
    min: 0,
  },
  // User input
  orderedMeters: {
    type: Number,
    required: true,
    min: 0,
  },
  // Calculated fields
  calculatedWeight: {
    type: Number,
    required: true,
  },
  calculatedAmount: {
    type: Number,
    required: true,
  },
});

const challanSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Open',
      index: true,
    },
    items: [challanItemSchema],
    
    // Totals (calculated and stored)
    totals: {
      totalMeters: {
        type: Number,
        default: 0,
      },
      totalWeight: {
        type: Number,
        default: 0,
      },
      subtotalAmount: {
        type: Number,
        default: 0,
      },
    },
    
    // Interest tracking
    interestTracking: {
      principalAmount: {
        type: Number,
        default: 0,
      },
      interestAccrued: {
        type: Number,
        default: 0,
      },
      lastCalculatedAt: {
        type: Date,
      },
      interestRate: {
        type: Number,
        default: 0,
      },
      interestType: {
        type: String,
        enum: ['simple', 'compound'],
        default: 'compound',
      },
    },
    
    // Payment tracking
    payments: [{
      amount: Number,
      date: Date,
      method: String,
      reference: String,
      notes: String,
    }],
    
    // History
    history: [{
      action: String,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      performedAt: {
        type: Date,
        default: Date.now,
      },
      changes: mongoose.Schema.Types.Mixed,
    }],
    
    notes: String,
    
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
challanSchema.index({ company: 1, challanNumber: 1 }, { unique: true });
challanSchema.index({ company: 1, party: 1 });
challanSchema.index({ company: 1, status: 1 });
challanSchema.index({ company: 1, issueDate: -1 });
challanSchema.index({ company: 1, dueDate: 1 });

// Virtual for total payable (principal + interest)
challanSchema.virtual('totalPayable').get(function () {
  return this.totals.subtotalAmount + (this.interestTracking.interestAccrued || 0);
});

// Virtual for days overdue
challanSchema.virtual('daysOverdue').get(function () {
  if (this.status === 'Paid' || this.status === 'Cancelled') return 0;
  const today = new Date();
  const due = new Date(this.dueDate);
  if (today <= due) return 0;
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included
challanSchema.set('toJSON', { virtuals: true });
challanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Challan', challanSchema);