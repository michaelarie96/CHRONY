const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  category: {
    type: String,
    trim: true
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'event',
    default: null
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
timeEntrySchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

// Pre-save hook to calculate duration if end date is present
timeEntrySchema.pre('save', function(next) {
  if (this.start && this.end && !this.isRunning) {
    this.duration = Math.floor((this.end - this.start) / 1000); // Convert ms to seconds
  }
  next();
});

module.exports = mongoose.model('timeEntry', timeEntrySchema);