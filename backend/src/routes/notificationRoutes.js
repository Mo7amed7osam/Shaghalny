const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');

// get all notifications 
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
