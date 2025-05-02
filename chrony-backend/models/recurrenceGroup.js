const mongoose = require('mongoose');

const recurrenceGroupSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  interval: {
    type: Number,
    default: 1,
    min: 1,
    required: true
  },
  startsOn: {
    type: Date,
    required: true
  },
  endsOn: {
    type: Date,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the 'updated' field on every save
recurrenceGroupSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

module.exports = mongoose.model('recurrenceGroup', recurrenceGroupSchema);