const Event = require('../models/Event');

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, isOnline } = req.body;
    const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : '';
    const event = await Event.create({
      title, description, date, time, location,
      isOnline: isOnline === 'true',
      imageUrl,
      createdBy: req.user.id,
    });
    res.status(201).json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const updates = { ...req.body, isOnline: req.body.isOnline === 'true' };
    if (req.file) updates.imageUrl = `/uploads/events/${req.file.filename}`;
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
