const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // User settings for scheduling algorithm
  settings: {
    activeStartTime: {
      type: String,
      default: '07:00',
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'activeStartTime must be in HH:MM format'
      }
    },
    activeEndTime: {
      type: String,
      default: '22:00',
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'activeEndTime must be in HH:MM format'
      }
    },
    restDay: {
      type: String,
      enum: ['saturday', 'sunday'],
      default: 'saturday'
    }
  },
    // User categories for time tracking
  categories: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      default: '#00AFB9'
    },
    created: {
      type: Date,
      default: Date.now
    }
  }],
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the 'updated' field and validate time logic
userSchema.pre('save', function(next) {
  this.updated = Date.now();
  
  // Validate that end time is after start time
  if (this.settings && this.settings.activeStartTime && this.settings.activeEndTime) {
    const [startHour, startMin] = this.settings.activeStartTime.split(':').map(Number);
    const [endHour, endMin] = this.settings.activeEndTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      this.invalidate('settings.activeEndTime', 'End time must be after start time');
    }
  }
  
  next();
});

module.exports = mongoose.model('user', userSchema);