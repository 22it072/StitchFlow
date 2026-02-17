// backend/models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  companyCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    minlength: 8,
    maxlength: 8
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  logo: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  settings: {
    defaultRole: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    allowJoinViaCode: {
      type: Boolean,
      default: true
    },
    maxUsers: {
      type: Number,
      default: 50
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  codeGeneratedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
companySchema.index({ createdBy: 1 });
companySchema.index({ isActive: 1 });

module.exports = mongoose.model('Company', companySchema);