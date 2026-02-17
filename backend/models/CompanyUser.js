// backend/models/CompanyUser.js
const mongoose = require('mongoose');

const companyUserSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  role: {
    type: String,
    enum: ['viewer', 'editor', 'admin', 'super_admin'],
    default: 'viewer'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure unique user per company
companyUserSchema.index({ user: 1, company: 1 }, { unique: true });
companyUserSchema.index({ company: 1, role: 1 });
companyUserSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('CompanyUser', companyUserSchema);