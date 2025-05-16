require('dotenv').config(); // Ensures .env variables are loaded at the very top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Middleware
// For development, allowing all origins is often fine.
// For production, you should restrict it to your frontend's actual URL.
// Example: const clientURL = process.env.CLIENT_URL || 'http://your-frontend-domain.com';
// app.use(cors({ origin: clientURL }));
app.use(cors());

// Init Middleware (Body Parser for JSON)
app.use(express.json()); // Modern Express way, no need for { extended: false } with express.json()

// Connect Database
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1); // Exit if DB connection string is missing
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true, // No longer needed in Mongoose 6+
    // useFindAndModify: false, // No longer needed in Mongoose 6+
})
.then(() => console.log('MongoDB Connected...'))
.catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); // Exit process with failure
});

// Define Routes
app.get('/api', (req, res) => res.send('Codyssey API Running')); // Changed to /api for consistency
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));