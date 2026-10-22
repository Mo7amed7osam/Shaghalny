const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const User = require('../models/User');

// Middleware to authenticate users based on JWT tokens
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded.id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(decoded.id)) {
            return res.status(401).json({ message: 'Session is no longer valid. Please sign in again.' });
        }
        const userExists = await User.exists({ _id: decoded.id, role: decoded.role });
        if (!userExists) {
            return res.status(401).json({ message: 'Session is no longer valid. Please sign in again.' });
        }
        req.user = { id: decoded.id, role: decoded.role }; // Attach user info to request
        next();
    } catch (error) {
        if (!(error instanceof jwt.JsonWebTokenError)) {
            return res.status(503).json({ message: 'Unable to verify your session. Please try again.' });
        }
        return res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = {
    authenticate,
};
