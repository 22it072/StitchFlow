const mongoose = require('mongoose');

const loomMaintenanceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    maintenanceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    loomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loom',
      required: true,
      index: true,
    },
    maintenanceType: {
      type: String,
      enum: ['Preventive', 'Breakdown', 'Service', 'Repair'],
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    actualDate: {
      type: Date,
      default: null,
    },
    durationHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    technicianName: {
      type: String,
      trim: true,
      default: '',
    },
    partsReplaced: [{
      partName: String,
      quantity: Number,
      cost: Number,
    }],
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextServiceDue: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
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
loomMaintenanceSchema.index({ company: 1, maintenanceId: 1 }, { unique: true });
loomMaintenanceSchema.index({ company: 1, loomId: 1, scheduledDate: -1 });
loomMaintenanceSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('LoomMaintenance', loomMaintenanceSchema);