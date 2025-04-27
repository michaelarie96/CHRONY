const express = require('express');
const router = express.Router();
const Event = require('../models/event');

// Create a new event
router.post('/', async (req, res) => {
  try {
    const { title, start, end, type, description, recurrence, user } = req.body;

    if (!title || !start || !end || !type || !user) {
      return res.status(400).json({ error: 'Missing required fields: title, start, end, type, or user' });
    }

    const event = new Event({
      title,
      start,
      end,
      type,
      description: description || '',
      recurrence: recurrence || null,
      user
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all events for a specific user
router.get('/', async (req, res) => {
  try {
    const { userId, start, end } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    const events = await Event.find({ user: userId });
    
    // Handle recurring events
    let allEvents = [];
    
    events.forEach(event => {
      if (event.recurrence && event.recurrence.enabled) {
        // Add original event
        allEvents.push(event);
        
        // Generate recurring instances within the queried date range if provided
        if (start && end && event.recurrence.enabled) {
          const instances = generateRecurringInstances(event, new Date(start), new Date(end));
          allEvents = allEvents.concat(instances);
        }
      } else {
        // Non-recurring event
        allEvents.push(event);
      }
    });
    
    res.status(200).json(allEvents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an event by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,             // Return the updated document
      runValidators: true    // Validate the updated fields against the schema
    });

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json(updatedEvent); // Return the updated event
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add exception to recurring event
router.post('/:id/exception', async (req, res) => {
  try {
    const { id } = req.params;
    const { exceptionDate } = req.body;
    
    if (!exceptionDate) {
      return res.status(400).json({ error: 'Missing exceptionDate in request body' });
    }
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (!event.recurrence || !event.recurrence.enabled) {
      return res.status(400).json({ error: 'This is not a recurring event' });
    }
    
    // Add the exception if it doesn't already exist
    const exceptionDateObj = new Date(exceptionDate);
    const existingException = event.recurrence.exceptions.find(
      exception => exception.getTime() === exceptionDateObj.getTime()
    );
    
    if (!existingException) {
      event.recurrence.exceptions.push(exceptionDateObj);
      await event.save();
    }
    
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const { deleteAll } = req.query;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Handle recurring event deletion
    if (event.recurrence && event.recurrence.enabled && deleteAll !== 'true') {
      // If it's a recurring event instance, add an exception to the parent event
      const instanceDate = new Date(req.query.instanceDate || event.start);
      
      if (!event.recurrence.exceptions) {
        event.recurrence.exceptions = [];
      }
      
      event.recurrence.exceptions.push(instanceDate);
      await event.save();
      
      return res.status(200).json({ message: 'Event instance deleted successfully' });
    } else {
      // Delete the entire event
      await Event.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: 'Event deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate recurring event instances
function generateRecurringInstances(event, startDate, endDate) {
  const instances = [];
  const recurrence = event.recurrence;
  
  if (!recurrence || !recurrence.enabled) {
    return instances;
  }
  
  const eventStart = new Date(event.start);
  const duration = new Date(event.end) - eventStart;
  
  let currentDate = new Date(eventStart);
  
  while (currentDate <= endDate) {
    // Skip the original event date and any exceptions
    const isException = recurrence.exceptions && recurrence.exceptions.some(
      exception => new Date(exception).setHours(0, 0, 0, 0) === new Date(currentDate).setHours(0, 0, 0, 0)
    );
    
    if (currentDate >= startDate && !isException && currentDate > eventStart) {
      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(instanceStart.getTime() + duration);
      
      instances.push({
        ...event.toObject(),
        id: `${event._id}_${instanceStart.getTime()}`,
        _id: `${event._id}_${instanceStart.getTime()}`,
        start: instanceStart,
        end: instanceEnd,
        isRecurringInstance: true,
        originalEventId: event._id
      });
    }
    
    // Move to the next occurrence based on frequency
    if (recurrence.frequency === 'daily') {
      currentDate.setDate(currentDate.getDate() + recurrence.interval);
    } else if (recurrence.frequency === 'weekly') {
      currentDate.setDate(currentDate.getDate() + (7 * recurrence.interval));
    } else if (recurrence.frequency === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
    }
  }
  
  return instances;
}

module.exports = router;