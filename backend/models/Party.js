const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    partyCode: {  // ADD THIS FIELD
      type: String,
      required: true,
      unique: true,
    },
    partyName: {
      type: String,
      required: [true, 'Please add a party name'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    interestPercentPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestType: {
      type: String,
      enum: ['simple', 'compound'],
      default: 'compound',
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentOutstanding: {
      type: Number,
      default: 0,
    },
    activeStatus: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized queries
partySchema.index({ company: 1, partyName: 'text', contactPerson: 'text' });
partySchema.index({ company: 1, activeStatus: 1 });
partySchema.index({ company: 1, createdAt: -1 });

// Virtual for available credit
partySchema.virtual('availableCredit').get(function () {
  return this.creditLimit - this.currentOutstanding;
});

// Ensure virtuals are included in JSON
partySchema.set('toJSON', { virtuals: true });
partySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Party', partySchema);