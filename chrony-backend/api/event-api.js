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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }

    const events = await Event.find({ user: userId });
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