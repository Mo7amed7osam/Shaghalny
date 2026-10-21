const multer = require('multer');
const path = require('path');
const { ensureDirectory, getInterviewUploadsDir, getUploadsRoot } = require('../utils/storagePaths');

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Keep only a safe extension: raw original names (spaces, Arabic, #, ?) break public URLs.
const safeExtension = (originalname = '') => {
  const ext = path.extname(originalname).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
};

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set destination based on file type
    const fileType = file.mimetype.split('/')[0];
    let uploadPath = path.join(getUploadsRoot(), 'cvs');
    if (fileType === 'video') {
      uploadPath = getInterviewUploadsDir();
    } else if (fileType === 'image') {
      uploadPath = path.join(getUploadsRoot(), 'photos');
    }
    ensureDirectory(getUploadsRoot());
    ensureDirectory(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Set the filename to be unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + safeExtension(file.originalname));
  }
});

// Initialize multer with the defined storage
const upload = multer({ storage });

// Image-only uploader (profile photo / cover) with a size cap
const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    return cb(null, true);
  },
});

// Run a multer handler and turn its errors into JSON 4xx responses instead of a generic 500
const handleUpload = (multerHandler) => (req, res, next) => {
  multerHandler(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `File is too large. Max size is ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.` });
    }
    if (error instanceof multer.MulterError || !error.code) {
      return res.status(400).json({ message: error.message || 'Invalid file upload.' });
    }
    // Filesystem errors (e.g. EACCES on an unwritable uploads volume) are server-side
    console.error('Upload storage error:', error);
    return res.status(500).json({ message: 'Upload failed on server.' });
  });
};

// Middleware for handling file uploads
const uploadMiddleware = (req, res, next) => {
  // Check if the request has files
  if (!req.files) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }
  next();
};

// Export the upload middleware and the upload instance
module.exports = {
  upload,
  imageUpload,
  handleUpload,
  uploadMiddleware,
};
