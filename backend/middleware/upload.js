import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

// File filter for video files
const fileFilter = (req, file, cb) => {
  // Allow video MIME types
  const allowedMimes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// Configure multer with fields for both single and multiple uploads
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 10 // Maximum 10 files at once
  }
}).fields([
  { name: 'video', maxCount: 1 },    // For single file upload
  { name: 'videos', maxCount: 10 }   // For multiple file upload
]);

// Wrapper middleware to handle multer errors and normalize file data
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error occurred (e.g., file too large, too many files)
      return res.status(400).json({
        error: true,
        message: `Upload error: ${err.message}`,
        code: err.code
      });
    } else if (err) {
      // Unknown error occurred
      return res.status(500).json({
        error: true,
        message: err.message || 'Unknown upload error occurred'
      });
    }
    // No error, normalize the files array for the controller
    if (!req.files) {
      return res.status(400).json({
        error: true,
        message: 'No files were uploaded',
        code: 'NO_FILES'
      });
    }

    // Combine files from both fields into req.files array
    req.files = [
      ...(req.files.video || []),
      ...(req.files.videos || [])
    ];

    if (req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No valid video files found',
        code: 'NO_VALID_FILES'
      });
    }

    next();
  });
};

export default uploadMiddleware;

