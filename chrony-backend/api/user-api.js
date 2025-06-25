const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Register 
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const user = new User({ 
      username, 
      password,
      // Default settings will be applied by the schema
    });
    await user.save();
    
    res.status(200).json({ 
      message: 'User registered successfully',
      needsSetup: true // Flag to indicate user needs to complete settings setup
    });
    console.log(`Register:\nUsername: ${username}\nPassword: ${password}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login  
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log(`Login:\nUsername: ${username}\nPassword: ${password}`);
    res.status(200).json({ 
      message: 'Login successful', 
      username: user.username,
      userId: user._id,
      settings: user.settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user settings
router.put('/settings', async (req, res) => {
  const { userId, activeStartTime, activeEndTime, restDay } = req.body;
  
  try {
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update settings (only update provided fields)
    if (activeStartTime !== undefined) {
      user.settings.activeStartTime = activeStartTime;
    }
    if (activeEndTime !== undefined) {
      user.settings.activeEndTime = activeEndTime;
    }
    if (restDay !== undefined) {
      user.settings.restDay = restDay;
    }
    
    // Save user
    await user.save();
    
    res.status(200).json({
      message: 'Settings updated successfully',
      settings: user.settings
    });
    
    console.log(`Settings updated for user: ${user.username}`);
  } catch (err) {
    // Handle validation errors specifically
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid settings data',
        details: err.message 
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get user settings
router.get('/settings/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      settings: user.settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;