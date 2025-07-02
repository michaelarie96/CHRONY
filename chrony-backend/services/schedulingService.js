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
    
    // Validate user settings first
    this.validateUserSettings(userSettings);
    
    try {
      switch (event.type) {
        case 'fixed':
          return this.scheduleFixedEvent(event, existingEvents, userSettings);
        
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
   * Fixed events: Validate constraints and check conflicts
   */
  scheduleFixedEvent(event, existingEvents, userSettings) {
    // Check if event is on rest day
    const eventDay = moment(event.start).day(); // 0 = Sunday, 6 = Saturday
    const restDayNumber = userSettings.restDay === 'sunday' ? 0 : 6;
    
    if (eventDay === restDayNumber) {
      throw new Error(`Cannot schedule on ${userSettings.restDay} (your rest day)`);
    }
    
    // Check if event fits within active hours
    if (!this.isWithinActiveHours(event.start, event.end, userSettings)) {
      const startTime = moment(event.start).format('HH:mm');
      const endTime = moment(event.end).format('HH:mm');
      throw new Error(`Event ${startTime}-${endTime} is outside active hours ${userSettings.activeStartTime}-${userSettings.activeEndTime}`);
    }
    
    // Check for conflicts
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
    const targetDay = moment(event.start).day();
    const restDayNumber = userSettings.restDay === 'sunday' ? 0 : 6;
    const durationMinutes = Math.floor(event.duration / 60);
    
    console.log(`🔍 Finding ${durationMinutes}min slot on ${targetDate}`);
    
    // Check if target day is rest day
    if (targetDay === restDayNumber) {
      throw new Error(`Cannot schedule on ${userSettings.restDay} (your rest day)`);
    }
    
    // Generate all possible time slots for the day
    const timeSlots = this.generateDayTimeSlots(targetDate, userSettings);
    
    // Forward Checking: Find valid slots that fit within active hours
    const validSlots = this.forwardCheck(timeSlots, durationMinutes, existingEvents, userSettings);
    
    if (validSlots.length === 0) {
      throw new Error(`No available ${durationMinutes}-minute slots on ${targetDate} within active hours ${userSettings.activeStartTime}-${userSettings.activeEndTime}`);
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
      const validSlots = this.forwardCheck(timeSlots, durationMinutes, existingEvents, userSettings);
      
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
    
    throw new Error(`No available ${durationMinutes}-minute slots in the working week (excluding ${userSettings.restDay})`);
  }

  /**
   * Forward Checking: Filter time slots that can accommodate the event duration
   * AND fit within active hours
   */
  forwardCheck(timeSlots, durationMinutes, existingEvents, userSettings) {
    const validSlots = [];
    
    for (const slot of timeSlots) {
      const proposedStart = slot;
      const proposedEnd = slot.clone().add(durationMinutes, 'minutes');
      
      // Check if the entire event fits within active hours
      if (!this.isWithinActiveHours(proposedStart.toDate(), proposedEnd.toDate(), userSettings)) {
        continue; // Skip this slot, doesn't fit in active hours
      }
      
      const proposedEvent = {
        start: proposedStart.toDate(),
        end: proposedEnd.toDate()
      };
      
      // Check if this slot conflicts with existing events
      const conflicts = this.findConflicts(proposedEvent, existingEvents);
      
      if (conflicts.length === 0) {
        validSlots.push({
          start: proposedStart,
          end: proposedEnd
        });
      }
    }
    
    return validSlots;
  }

  /**
   * Check if an event fits completely within user's active hours
   */
  isWithinActiveHours(startTime, endTime, userSettings) {
    const eventStart = moment(startTime);
    const eventEnd = moment(endTime);
    const eventDate = eventStart.format('YYYY-MM-DD');
    
    // Create moment objects for active hours on the same date
    const activeStart = moment(`${eventDate} ${userSettings.activeStartTime}`);
    const activeEnd = moment(`${eventDate} ${userSettings.activeEndTime}`);
    
    // Event must start at or after active start time
    // AND end at or before active end time
    const startsWithinHours = eventStart.isSameOrAfter(activeStart);
    const endsWithinHours = eventEnd.isSameOrBefore(activeEnd);
    
    return startsWithinHours && endsWithinHours;
  }

  /**
   * Generate all possible time slots for a day based on user settings
   */
  generateDayTimeSlots(dateString, userSettings) {
    const slots = [];
    const startTime = moment(`${dateString} ${userSettings.activeStartTime}`);
    const endTime = moment(`${dateString} ${userSettings.activeEndTime}`);
    
    let current = startTime.clone();
    
    // Generate slots up to (but not including) end time
    // This ensures events can't extend beyond active hours
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
    
    // Validate rest day
    if (!['saturday', 'sunday'].includes(userSettings.restDay)) {
      throw new Error('Rest day must be either "saturday" or "sunday"');
    }
    
    return true;
  }
}

module.exports = new SchedulingService();