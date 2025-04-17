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

    const user = new User({ username, password });
    await user.save();
    res.status(200).json({ message: 'User registered successfully' });
    console.log(`Register:\nUsername: ${username}\npassword: ${password}`);
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
    console.log(`Username: ${username}\npassword: ${password}`);
    res.status(200).json({ message: 'Login successful', username: user.username });
  } catch (err) {
    res.status(501).json({ error: err.message });
  }
});

module.exports = router;