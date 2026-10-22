const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');

// User registration
const register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            isDemo: process.env.DEMO_MODE === 'true',
            name,
            email,
            password: hashedPassword,
            role: role || 'Student',
        });

        await newUser.save();

        // Generate JWT token
        const token = generateToken(newUser._id.toString(), newUser.role);
        const userObject = newUser.toObject();
        const { password: _password, ...safeUser } = userObject;

        res.status(201).json({ token, user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// User login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user._id.toString(), user.role);
        const userObject = user.toObject();
        const { password: _password, ...safeUser } = userObject;

        res.status(200).json({ token, user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
};
