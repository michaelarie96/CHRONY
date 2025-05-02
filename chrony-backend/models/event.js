const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['fixed', 'flexible', 'fluid'],
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isRecurringInstance: {
    type: Boolean,
    default: false
  },
  recurrenceGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'recurrenceGroup',
    default: null
  },
  recurrencePosition: {
    type: Number,
    default: 0
  },
  isException: {
    type: Boolean,
    default: false
  },
  modifiedProperties: {
    type: Object,
    default: {}
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
eventSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

module.exports = mongoose.model('event', eventSchema);