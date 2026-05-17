const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { getAllEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/roleCheck');

const eventsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
});

const uploadDir = path.join(__dirname, '../../uploads/events');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get('/', eventsReadLimiter, getAllEvents);
router.post('/', authenticate, checkAdmin, upload.single('image'), createEvent);
router.put('/:id', authenticate, checkAdmin, upload.single('image'), updateEvent);
router.delete('/:id', authenticate, checkAdmin, deleteEvent);

module.exports = router;
