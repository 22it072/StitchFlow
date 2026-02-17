const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    formData: {
      type: Object,
      required: true,
    },
    formType: {
      type: String,
      enum: ['estimate', 'yarn'],
      default: 'estimate',
    },
    lastSaved: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Draft', draftSchema);