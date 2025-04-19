const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
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
  // Recurrence properties
  recurrence: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'custom', null],
      default: null
    },
    daysOfWeek: {
      type: [Number], // 0 = Sunday, 1 = Monday, etc.
      default: []
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  description: {
    type: String,
    default: ''
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

// Add index for faster queries
eventSchema.index({ user: 1, start: 1 });
eventSchema.index({ user: 1, type: 1 });

// Pre-save hook to update the 'updated' field on every save
eventSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

module.exports = mongoose.model('event', eventSchema); // 'event' is the collection name 