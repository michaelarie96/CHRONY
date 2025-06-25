const moment = require('moment');

class SchedulingService {
  constructor() {
    this.SLOT_DURATION_MINUTES = 15; // Check every 15 minutes
  }

  /**
   * Main entry point for scheduling events using Forward Checking with Backtracking
   * @param {Object} event - Event to schedule
   * @param {Array} existingEvents - User's existing events
   * @param {Object} userSettings - User's scheduling constraints
   * @returns {Object} - Scheduled event with optimized start/end times
   */
  async scheduleEvent(event, existingEvents, userSettings) {
    console.log(`\n🧠 SCHEDULING: ${event.title} (${event.type})`);
    
    try {
      switch (event.type) {
        case 'fixed':
          return this.scheduleFixedEvent(event, existingEvents);
        
        case 'flexible':
          return this.scheduleFlexibleEvent(event, existingEvents, userSettings);
        
        case 'fluid':
          return this.scheduleFluidEvent(event, existingEvents, userSettings);
        
        default:
          throw new Error(`Unknown event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Scheduling failed for ${event.title}:`, error.message);
      throw error;
    }
  }

  /**
   * Fixed events: Just validate no conflicts exist
   */
  scheduleFixedEvent(event, existingEvents) {
    const conflicts = this.findConflicts(event, existingEvents);
    
    if (conflicts.length > 0) {
      throw new Error(`Fixed event conflicts with: ${conflicts.map(c => c.title).join(', ')}`);
    }
    
    console.log(`✅ Fixed event scheduled successfully`);
    return event; // Return as-is, no changes needed
  }

  /**
   * Flexible events: Find best time on specific day using Forward Checking
   */
  scheduleFlexibleEvent(event, existingEvents, userSettings) {
    const targetDate = moment(event.start).format('YYYY-MM-DD');
    const durationMinutes = Math.floor(event.duration / 60);
    
    console.log(`🔍 Finding ${durationMinutes}min slot on ${targetDate}`);
    
    // Generate all possible time slots for the day
    const timeSlots = this.generateDayTimeSlots(targetDate, userSettings);
    
    // Forward Checking: Find valid slots
    const validSlots = this.forwardCheck(timeSlots, durationMinutes, existingEvents);
    
    if (validSlots.length === 0) {
      throw new Error(`No available ${durationMinutes}-minute slots on ${targetDate}`);
    }
    
    // Select best slot (earliest available)
    const bestSlot = validSlots[0];
    const optimizedEvent = {
      ...event,
      start: bestSlot.start.toDate(),
      end: bestSlot.end.toDate()
    };
    
    console.log(`✅ Flexible event scheduled: ${bestSlot.start.format('HH:mm')} - ${bestSlot.end.format('HH:mm')}`);
    return optimizedEvent;
  }

  /**
   * Fluid events: Find best day + time in week using Backtracking
   */
  scheduleFluidEvent(event, existingEvents, userSettings) {
    const durationMinutes = Math.floor(event.duration / 60);
    const weekStart = moment(event.start).startOf('week');
    
    console.log(`🌊 Finding ${durationMinutes}min slot anywhere this week`);
    
    // Get working days (excluding rest day)
    const workingDays = this.getWorkingDays(weekStart, userSettings.restDay);
    
    // Backtracking: Try each day until we find a solution
    for (const day of workingDays) {
      console.log(`  🔍 Trying ${day.format('dddd, MMM DD')}`);
      
      const timeSlots = this.generateDayTimeSlots(day.format('YYYY-MM-DD'), userSettings);
      const validSlots = this.forwardCheck(timeSlots, durationMinutes, existingEvents);
      
      if (validSlots.length > 0) {
        const bestSlot = validSlots[0];
        const optimizedEvent = {
          ...event,
          start: bestSlot.start.toDate(),
          end: bestSlot.end.toDate()
        };
        
        console.log(`✅ Fluid event scheduled: ${day.format('dddd')} ${bestSlot.start.format('HH:mm')} - ${bestSlot.end.format('HH:mm')}`);
        return optimizedEvent;
      }
    }
    
    throw new Error(`No available ${durationMinutes}-minute slots in the working week`);
  }

  /**
   * Forward Checking: Filter time slots that can accommodate the event duration
   */
  forwardCheck(timeSlots, durationMinutes, existingEvents) {
    const validSlots = [];
    
    for (const slot of timeSlots) {
      const proposedEvent = {
        start: slot.toDate(),
        end: slot.clone().add(durationMinutes, 'minutes').toDate()
      };
      
      // Check if this slot conflicts with existing events
      const conflicts = this.findConflicts(proposedEvent, existingEvents);
      
      if (conflicts.length === 0) {
        validSlots.push({
          start: slot,
          end: slot.clone().add(durationMinutes, 'minutes')
        });
      }
    }
    
    return validSlots;
  }

  /**
   * Generate all possible time slots for a day based on user settings
   */
  generateDayTimeSlots(dateString, userSettings) {
    const slots = [];
    const startTime = moment(`${dateString} ${userSettings.activeStartTime}`);
    const endTime = moment(`${dateString} ${userSettings.activeEndTime}`);
    
    let current = startTime.clone();
    
    while (current.isBefore(endTime)) {
      slots.push(current.clone());
      current.add(this.SLOT_DURATION_MINUTES, 'minutes');
    }
    
    return slots;
  }

  /**
   * Get working days for the week (excluding rest day)
   */
  getWorkingDays(weekStart, restDay) {
    const days = [];
    const restDayNumber = restDay === 'sunday' ? 0 : 6; // Sunday = 0, Saturday = 6
    
    // Generate 7 days starting from week start (Sunday)
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, 'days');
      
      // Skip rest day
      if (day.day() !== restDayNumber) {
        days.push(day);
      }
    }
    
    return days;
  }

  /**
   * Find conflicts between a proposed event and existing events
   */
  findConflicts(proposedEvent, existingEvents) {
    const conflicts = [];
    const proposedStart = moment(proposedEvent.start);
    const proposedEnd = moment(proposedEvent.end);
    
    for (const existing of existingEvents) {
      const existingStart = moment(existing.start);
      const existingEnd = moment(existing.end);
      
      // Check for overlap: events conflict if one starts before the other ends
      const hasOverlap = proposedStart.isBefore(existingEnd) && proposedEnd.isAfter(existingStart);
      
      if (hasOverlap) {
        conflicts.push(existing);
      }
    }
    
    return conflicts;
  }

  /**
   * Validate that user settings are present and valid
   */
  validateUserSettings(userSettings) {
    if (!userSettings) {
      throw new Error('User settings are required for scheduling');
    }
    
    const required = ['activeStartTime', 'activeEndTime', 'restDay'];
    for (const field of required) {
      if (!userSettings[field]) {
        throw new Error(`User setting '${field}' is required`);
      }
    }
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(userSettings.activeStartTime) || !timeRegex.test(userSettings.activeEndTime)) {
      throw new Error('Invalid time format in user settings');
    }
    
    return true;
  }
}

module.exports = new SchedulingService();