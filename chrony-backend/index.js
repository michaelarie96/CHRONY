const express = require('express');
const mongoose = require('mongoose')
const app = express();
const PORT = 3000;


mongoose.connect('mongodb+srv//dorz:Doradiv10@dordb.wz8qgma.mongodb.net/?retryWrites=true&w=majority&appName=DorDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));


//mongoose.connect(`mongodb+srv//dorz:Doradiv10@dordb.wz8qgma.mongodb.net/?retryWrites=true&w=majority&appName=DorDB`);

app.get('/', (req, res) => {
    res.send('Backend is working!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});