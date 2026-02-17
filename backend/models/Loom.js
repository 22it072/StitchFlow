const mongoose = require('mongoose');

const loomSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    loomNumber: {
      type: String,
      required: [true, 'Loom number is required'],
      trim: true,
      uppercase: true,
    },
    loomType: {
      type: String,
      required: [true, 'Loom type is required'],
      enum: ['Auto', 'Semi-Auto', 'Rapier', 'Air Jet', 'Water Jet', 'Projectile'],
    },
    loomMake: {
      type: String,
      trim: true,
      default: '',
    },
    reedWidth: {
      type: Number,
      required: [true, 'Reed width is required'],
      min: [1, 'Reed width must be greater than 0'],
    },
    reedWidthUnit: {
      type: String,
      enum: ['inches', 'cm'],
      default: 'inches',
    },
    rpm: {
      type: Number,
      required: [true, 'RPM is required'],
      min: [1, 'RPM must be greater than 0'],
    },
    status: {
      type: String,
      enum: ['Active', 'Idle', 'Under Maintenance', 'Breakdown'],
      default: 'Idle',
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    operatorAssigned: {
      type: String,
      trim: true,
      default: null,
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    nextMaintenanceDate: {
      type: Date,
      default: null,
    },
    totalRunningHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeavingSet',
      default: null,
    },
    currentBeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beam',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
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
loomSchema.index({ company: 1, loomNumber: 1 }, { unique: true });
loomSchema.index({ company: 1, status: 1 });
loomSchema.index({ company: 1, isActive: 1 });
loomSchema.index({ company: 1, loomType: 1 });

// Virtual for status color
loomSchema.virtual('statusColor').get(function () {
  const colors = {
    'Active': 'green',
    'Idle': 'yellow',
    'Under Maintenance': 'blue',
    'Breakdown': 'red',
  };
  return colors[this.status] || 'gray';
});

// Virtual for maintenance due status
loomSchema.virtual('maintenanceDue').get(function () {
  if (!this.nextMaintenanceDate) return false;
  return new Date() >= new Date(this.nextMaintenanceDate);
});

// Ensure virtuals are included
loomSchema.set('toJSON', { virtuals: true });
loomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loom', loomSchema);