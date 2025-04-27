const mongoose = require('mongoose');

const recurrenceSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  interval: {
    type: Number,
    default: 1,
    min: 1
  },
  exceptions: {
    type: [Date],  // Array of dates when the event doesn't occur
    default: []
  }
});

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
  recurrence: {
    type: recurrenceSchema,
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
eventSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

module.exports = mongoose.model('event', eventSchema); // 'event' is the collection name