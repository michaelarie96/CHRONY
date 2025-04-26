// libraries modules
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
require('dotenv').config();

// user-created modules
const userRoutes = require('./api/user-api');  
const eventRoutes = require('./api/event-api');
const timeEntryRoutes = require('./api/timeEntry-api');

const app = express();
const PORT = 3000;




mongoose.connect(process.env.mongoURI, 
    { dbName: `chrony` ,
    useNewUrlParser: true,
  useUnifiedTopology: true}
).then(() => console.log("connected to Database"))
.catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json()); // this is needed to parse from req.body
// this tells the app what to do with the routing 
app.use('/api/event', eventRoutes); 
app.use('/api/user', userRoutes); 
app.use('/api/timeEntries', timeEntryRoutes);

app.get('/', (res) => {
    res.send('Backend is working!');
});

// pinging to frontend .
app.get('/api/ping', (res) => {
    console.log('Frontend hit the backend at /api/ping');
    res.json({ message: 'Pong from backend' });
  });

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});