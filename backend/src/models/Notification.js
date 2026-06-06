const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'event' },
  isRead: { type: Boolean, default: false },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
