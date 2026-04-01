const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../services/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `videovault/${req.user.organization}`,
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg', 'mpeg'],
    // Use original filename base + timestamp for uniqueness
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_')}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'video/ogg',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not supported.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 524288000, // 500MB
  },
});

// Keep UPLOAD_DIR export for backward compat (not used for cloud storage)
const UPLOAD_DIR = null;

module.exports = { upload, UPLOAD_DIR };
