const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { getAllEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/roleCheck');
const { ensureDirectory, getUploadsRoot } = require('../utils/storagePaths');

const eventsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
});

// Store under UPLOADS_ROOT so event images live on the persistent uploads volume
const getEventsUploadDir = () => path.join(getUploadsRoot(), 'events');
ensureDirectory(getEventsUploadDir());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getEventsUploadDir();
    ensureDirectory(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get('/', eventsReadLimiter, getAllEvents);
router.post('/', authenticate, checkAdmin, upload.single('image'), createEvent);
router.put('/:id', authenticate, checkAdmin, upload.single('image'), updateEvent);
router.delete('/:id', authenticate, checkAdmin, deleteEvent);

module.exports = router;
