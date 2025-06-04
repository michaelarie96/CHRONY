const express = require('express');
const router = express.Router();
const Event = require('../models/event');

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

// Create a new event/s
router.post('/', async (req, res) => {
  try {
    const { title, start, end, type, description, recurrence, user } = req.body;

    if (!title || !start || !end || !type || !user) {
      return res.status(400).json({ error: 'Missing required fields: title, start, end, type, or user' });
    }

    const baseEventData = {
      title,
      start,
      end,
      type,
      description: description || '',
      user
    };

    let createdEvents = [];

    if (recurrence && recurrence.enabled) {
      // Create recurring events
      const eventInstances = createRecurringEvents(baseEventData, recurrence);
      createdEvents = await Event.insertMany(eventInstances);
    } else {
      // Create single event
      const event = new Event(baseEventData);
      const savedEvent = await event.save();
      createdEvents = [savedEvent];
    }

    res.status(201).json(createdEvents);
  } catch (error) {
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

    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;