const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/timeEntry');

// Create a new time entry
router.post('/', async (req, res) => {
  try {
    const timeEntry = new TimeEntry(req.body);
    await timeEntry.save();
    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all time entries for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find({ user: req.params.userId })
      .sort({ start: -1 })
      .populate('event', 'title type');
    res.status(200).json(timeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get the active time entry for a user (if any)
router.get('/active/:userId', async (req, res) => {
  try {
    const activeEntry = await TimeEntry.findOne({ 
      user: req.params.userId,
      isRunning: true 
    }).populate('event', 'title type');
    
    if (!activeEntry) {
      return res.status(404).json({ message: 'No active time entry found' });
    }
    
    res.status(200).json(activeEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get time entries for a specific date range
router.get('/range', async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  
  if (!startDate || !endDate || !userId) {
    return res.status(400).json({ message: 'startDate, endDate, and userId are required' });
  }
  
  try {
    const timeEntries = await TimeEntry.find({
      user: userId,
      start: { $gte: new Date(startDate) },
      end: { $lte: new Date(endDate) }
    }).sort({ start: -1 })
      .populate('event', 'title type');
    
    res.status(200).json(timeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single time entry by ID
router.get('/:id', async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)
      .populate('event', 'title type');
    
    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    res.status(200).json(timeEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a time entry
router.put('/:id', async (req, res) => {
  try {
    const updatedEntry = await TimeEntry.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    
    if (!updatedEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    res.status(200).json(updatedEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stop an active time entry
router.put('/stop/:id', async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id);
    
    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    if (!timeEntry.isRunning) {
      return res.status(400).json({ message: 'Time entry is not running' });
    }
    
    timeEntry.end = new Date();
    timeEntry.isRunning = false;
    timeEntry.duration = Math.floor((timeEntry.end - timeEntry.start) / 1000);
    
    await timeEntry.save();
    res.status(200).json(timeEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a time entry
router.delete('/:id', async (req, res) => {
  try {
    const deletedEntry = await TimeEntry.findByIdAndDelete(req.params.id);
    
    if (!deletedEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }
    
    res.status(200).json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;