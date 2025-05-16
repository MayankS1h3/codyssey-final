const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Adjust path if needed
const User = require('../models/User'); // Adjust path if needed

// @route   POST api/user/handles
// @desc    Save/Update user's LeetCode and Codeforces handles
// @access  Private (requires token)
router.post('/handles', authMiddleware, async (req, res) => {
    const { leetcodeUsername, codeforcesHandle } = req.body;
    try {
        // req.user.id comes from the authMiddleware decoding the JWT
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Only update if the value is actually provided in the request
        // Allows clearing a handle by sending an empty string
        if (leetcodeUsername !== undefined) {
            user.leetcodeUsername = leetcodeUsername.trim();
        }
        if (codeforcesHandle !== undefined) {
            user.codeforcesHandle = codeforcesHandle.trim();
        }

        await user.save();
        res.json({
            message: 'Handles updated successfully',
            leetcodeUsername: user.leetcodeUsername,
            codeforcesHandle: user.codeforcesHandle
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error updating handles');
    }
});

// @route   GET api/user/me
// @desc    Get current user's profile (excluding password)
// @access  Private (requires token)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // -password excludes the password field
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error getting user profile');
    }
});

module.exports = router;