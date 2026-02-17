const mongoose = require('mongoose');

const weavingProductionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    shift: {
      type: String,
      enum: ['Day', 'Night', 'General'],
      default: 'General',
    },
    
    // Links
    loomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loom',
      required: true,
      index: true,
    },
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeavingSet',
      required: true,
      index: true,
    },
    beamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beam',
      default: null,
    },
    
    // Operator info
    operatorName: {
      type: String,
      trim: true,
      required: [true, 'Operator name is required'],
    },
    
    // Time tracking
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalHours: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Production data
    metersProduced: {
      type: Number,
      required: [true, 'Meters produced is required'],
      min: [0, 'Meters produced cannot be negative'],
    },
    actualPicks: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // Beam tracking
    beamLengthUsed: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // Quality tracking
    defects: {
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
      types: [{
        type: String,
        enum: ['Broken End', 'Missing Pick', 'Reed Mark', 'Stain', 'Wrong Pattern', 'Other'],
      }],
      description: String,
    },
    
    // Downtime tracking
    loomStoppageTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    stoppageReason: {
      type: String,
      enum: ['Breakdown', 'Power Cut', 'No Beam', 'Yarn Issue', 'Maintenance', 'Other', 'None'],
      default: 'None',
    },
    
    // Calculated fields (using utility functions)
    efficiency: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    metersPerHour: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
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
weavingProductionSchema.index({ company: 1, entryDate: -1 });
weavingProductionSchema.index({ company: 1, loomId: 1, entryDate: -1 });
weavingProductionSchema.index({ company: 1, setId: 1 });
weavingProductionSchema.index({ company: 1, shift: 1 });

module.exports = mongoose.model('WeavingProduction', weavingProductionSchema);