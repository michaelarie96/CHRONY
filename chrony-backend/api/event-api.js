const express = require('express');
const router = express.Router();
const Event = require('../models/event');
const User = require('../models/user');
const schedulingService = require('../services/schedulingService');

// Helper function to create recurring events
const createRecurringEvents = (eventData, recurrence) => {
  const events = [];
  const { frequency, interval, count = 10 } = recurrence;
  
  for (let i = 0; i < count; i++) {
    const eventStart = new Date(eventData.start);
    const eventEnd = new Date(eventData.end);
    
    // Calculate the date offset
    if (frequency === 'daily') {
      eventStart.setDate(eventStart.getDate() + (i * interval));
      eventEnd.setDate(eventEnd.getDate() + (i * interval));
    } else if (frequency === 'weekly') {
      eventStart.setDate(eventStart.getDate() + (i * interval * 7));
      eventEnd.setDate(eventEnd.getDate() + (i * interval * 7));
    } else if (frequency === 'monthly') {
      eventStart.setMonth(eventStart.getMonth() + (i * interval));
      eventEnd.setMonth(eventEnd.getMonth() + (i * interval));
    }
    
    events.push({
      ...eventData,
      start: eventStart,
      end: eventEnd
    });
  }
  
  return events;
};

// Create a new event/s with intelligent scheduling
router.post('/', async (req, res) => {
  try {
    const { title, start, end, type, description, recurrence, user, duration } = req.body;

    if (!title || !start || !end || !type || !user) {
      return res.status(400).json({ error: 'Missing required fields: title, start, end, type, or user' });
    }

    console.log(`\n📅 API: Creating ${type} event "${title}" for user ${user}`);

    // Step 1: Fetch user settings (required for scheduling algorithm)
    const userDoc = await User.findById(user);
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate user has completed settings setup
    if (!userDoc.settings || !userDoc.settings.activeStartTime || !userDoc.settings.activeEndTime) {
      return res.status(400).json({ 
        error: 'User settings incomplete. Please complete your profile setup first.' 
      });
    }

    // Step 2: Fetch existing events for conflict checking
    const existingEvents = await Event.find({ user: user });
    console.log(`📊 Found ${existingEvents.length} existing events for conflict checking`);

    // Step 3: Prepare event data for scheduling
    const eventStart = new Date(start);
    const eventEnd = new Date(end);
    
    // Calculate duration for event (in seconds)
    const calculatedDuration = duration || Math.floor((eventEnd - eventStart) / 1000);
    
    const baseEventData = {
      title,
      start: eventStart,
      end: eventEnd,
      type,
      description: description || '',
      user,
      duration: calculatedDuration
    };

    let createdEvents = [];

    if (recurrence && recurrence.enabled) {
      console.log(`🔄 Creating ${recurrence.count} recurring events`);
      
      const eventInstances = createRecurringEvents(baseEventData, recurrence);
      
      // Schedule each recurring event individually
      const scheduledInstances = [];
      for (let i = 0; i < eventInstances.length; i++) {
        const instance = eventInstances[i];
        console.log(`\n🧠 Scheduling instance ${i + 1}/${eventInstances.length}`);
        
        try {
          // Use scheduling service to optimize timing
          const scheduledEvent = await schedulingService.scheduleEvent(
            instance, 
            [...existingEvents, ...scheduledInstances], // Include previously scheduled instances
            userDoc.settings
          );
          
          scheduledInstances.push(scheduledEvent);
        } catch (error) {
          console.error(`❌ Failed to schedule instance ${i + 1}:`, error.message);
          
          // For recurring events, we'll skip problematic instances rather than fail completely
          if (type === 'fixed') {
            // Fixed events must be scheduled exactly, so fail if there's a conflict
            return res.status(409).json({ 
              error: `Cannot schedule recurring event instance ${i + 1}: ${error.message}` 
            });
          } else {
            // For flexible/fluid, skip this instance and continue
            console.log(`⚠️ Skipping instance ${i + 1} due to scheduling conflict`);
            continue;
          }
        }
      }
      
      if (scheduledInstances.length === 0) {
        return res.status(409).json({ 
          error: 'Unable to schedule any instances of the recurring event' 
        });
      }
      
      // Save all successfully scheduled instances
      createdEvents = await Event.insertMany(scheduledInstances);
      console.log(`✅ Successfully created ${createdEvents.length} recurring events`);
      
    } else {
      console.log(`🎯 Creating single event`);
      
      try {
        // Step 4: Use scheduling service to optimize event timing
        const scheduledEvent = await schedulingService.scheduleEvent(
          baseEventData, 
          existingEvents, 
          userDoc.settings
        );
        
        console.log(`🧠 Scheduling result:`, {
          original: `${new Date(start).toISOString()} - ${new Date(end).toISOString()}`,
          optimized: `${scheduledEvent.start.toISOString()} - ${scheduledEvent.end.toISOString()}`
        });
        
        // Step 5: Save the optimized event
        const event = new Event(scheduledEvent);
        const savedEvent = await event.save();
        createdEvents = [savedEvent];
        
        console.log(`✅ Event created successfully with optimized timing`);
        
      } catch (error) {
        console.error(`❌ Scheduling failed:`, error.message);
        
        if (error.message.includes('conflicts with') || error.message.includes('No available')) {
          return res.status(409).json({ 
            error: `Scheduling conflict: ${error.message}`,
            type: 'SCHEDULING_CONFLICT'
          });
        } else {
          return res.status(500).json({ 
            error: `Scheduling error: ${error.message}` 
          });
        }
      }
    }

    res.status(201).json(createdEvents);
  } catch (error) {
    console.error('❌ Event creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all events for a specific user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    const events = await Event.find({ user: userId }).sort({ start: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an event by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // For event updates, we should also run through scheduling if timing changes
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if this is a timing-related update
    const isTimingUpdate = updateData.start || updateData.end || updateData.type || updateData.duration;
    
    if (isTimingUpdate) {
      console.log(`\n📝 Updating event with timing changes: ${existingEvent.title}`);
      
      // Fetch user settings and other events for rescheduling
      const userDoc = await User.findById(existingEvent.user);
      if (!userDoc || !userDoc.settings) {
        return res.status(400).json({ error: 'User settings not found' });
      }
      
      // Get other events (excluding the one being updated)
      const otherEvents = await Event.find({ 
        user: existingEvent.user, 
        _id: { $ne: id } 
      });
      
      // Prepare updated event data
      const updatedEventData = {
        ...existingEvent.toObject(),
        ...updateData,
        start: updateData.start ? new Date(updateData.start) : existingEvent.start,
        end: updateData.end ? new Date(updateData.end) : existingEvent.end
      };
      
      try {
        // Use scheduling service to validate/optimize the update
        const scheduledEvent = await schedulingService.scheduleEvent(
          updatedEventData,
          otherEvents,
          userDoc.settings
        );
        
        const updatedEvent = await Event.findByIdAndUpdate(id, scheduledEvent, {
          new: true,
          runValidators: true
        });
        
        console.log(`✅ Event updated with optimized timing`);
        res.status(200).json(updatedEvent);
        
      } catch (error) {
        console.error(`❌ Update scheduling failed:`, error.message);
        return res.status(409).json({ 
          error: `Cannot update event: ${error.message}`,
          type: 'SCHEDULING_CONFLICT'
        });
      }
      
    } else {
      // Simple update (no timing changes)
      const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      });
      
      console.log(`✅ Event updated (non-timing changes)`);
      res.status(200).json(updatedEvent);
    }

  } catch (error) {
    console.error('❌ Event update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: 'Event not found' });
    
    console.log(`🗑️ Event deleted: ${deletedEvent.title}`);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;