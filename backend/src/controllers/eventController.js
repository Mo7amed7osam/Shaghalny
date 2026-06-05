const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

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

    const students = await User.find({ role: 'Student' }, '_id email name');

    const notifications = students.map(s => ({
      userId: s._id,
      title: 'New Event Added!',
      message: `${title} on ${new Date(date).toDateString()} at ${time} — ${location}`,
      type: 'event',
      eventId: event._id,
    }));

    await Notification.insertMany(notifications);

    for (const student of students) {
      await emailService.sendNewEventEmail(student.email, student.name, {
        title, description, date, time, location, isOnline: isOnline === 'true'
      });
    }

    res.status(201).json({ event });
  } catch (err) {
    console.error("CREATE EVENT ERROR:", err); res.status(400).json({ message: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['title', 'description', 'date', 'time', 'location'];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'isOnline')) {
      updates.isOnline = req.body.isOnline === 'true';
    }

    if (req.file) updates.imageUrl = `/uploads/events/${req.file.filename}`;
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    console.error("CREATE EVENT ERROR:", err); res.status(400).json({ message: err.message });
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
