require('dotenv').config(); // Ensures .env variables are loaded at the very top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const fetch = require('node-fetch'); // Use this if you are on Node < 18 and prefer node-fetch
                                     // If using Node 18+, fetch is global.

const app = express();

// CORS Middleware
app.use(cors()); // For development. For production, restrict to your frontend's URL.

// Init Middleware (Body Parser for JSON)
app.use(express.json());

// Connect Database
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1);
}

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected...'))
.catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
});

// Define Routes
app.get('/api', (req, res) => res.send('Codyssey API Running'));
app.use('/api/auth', require('./routes/auth')); // Assuming you have this file
app.use('/api/user', require('./routes/user')); // Assuming you have this file

// NEW: Codeforces Proxy Route
app.get('/api/cf-proxy/user-status', async (req, res) => {
    const handle = req.query.handle;
    if (!handle) {
        return res.status(400).json({ message: 'Codeforces handle is required' });
    }

    const count = req.query.count || 5000; // Default to 5000 if not specified
    const from = req.query.from || 1;     // Default to 1 if not specified

    try {
        const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${count}`;
        // Using global fetch (available in Node.js 18+)
        const cfResponse = await fetch(cfUrl);

        if (!cfResponse.ok) {
            let cfErrorData;
            try {
                cfErrorData = await cfResponse.json();
            } catch (e) {
                console.error('Codeforces API non-JSON error response:', cfResponse.statusText);
                return res.status(cfResponse.status).json({ message: `Codeforces API Error: ${cfResponse.statusText}` });
            }
            console.error('Codeforces API error response from proxy:', cfErrorData);
            return res.status(cfResponse.status).json({
                message: `Codeforces API Error: ${cfErrorData.comment || cfResponse.statusText}`,
                cfComment: cfErrorData.comment
            });
        }

        const data = await cfResponse.json();
        res.json(data); // Send the successful response from Codeforces back to your frontend
    } catch (error) {
        // This catches network errors for the fetch call or other unexpected errors
        console.error('Error in Codeforces proxy route:', error.message); // Log the error message
        res.status(500).json({ message: 'Server error while fetching from Codeforces.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));