// libraries modules
const express = require('express');
const mongoose = require('mongoose')
require('dotenv').config();

// user-created modules
const User = require('./models/user');



const app = express();
const PORT = 3000;


//mongoose.connect(process.env.mongoURI).then(() => console.log("connected to Database"))
//.catch(err => console.error('MongoDB connection error:', err));



app.get('/', (req, res) => {
    res.send('Backend is working!');
});

app.get('/api/ping', (req, res) => {
    console.log('Frontend hit the backend at /api/ping');
    res.json({ message: 'Pong from backend' });
  });

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});