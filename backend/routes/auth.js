const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path if your models folder is different

// @route   POST api/auth/signup
// @desc    Register a user
// @access  Public
router.post('/signup', async (req, res) => {
    const { email, password, leetcodeUsername, codeforcesHandle } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ email, password, leetcodeUsername, codeforcesHandle });
        await user.save();

        res.status(201).json({ message: 'User registered successfully. Please login.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error during signup');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials (email not found)' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials (password incorrect)' });

        const payload = { user: { id: user.id } }; // user.id is the MongoDB _id

        // Make sure JWT_SECRET is loaded
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET not defined in environment variables.");
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing.' });
        }

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                email: user.email,
                leetcodeUsername: user.leetcodeUsername,
                codeforcesHandle: user.codeforcesHandle
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error during login');
    }
});

module.exports = router;