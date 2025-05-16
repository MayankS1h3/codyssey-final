const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Token format invalid, authorization denied' });
    }

    try {
        // Make sure JWT_SECRET is loaded, typically via process.env
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET not defined in environment variables.");
            return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Add user from payload (should contain user id)
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};