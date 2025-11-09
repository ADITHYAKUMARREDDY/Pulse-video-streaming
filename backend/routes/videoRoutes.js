import express from 'express';
import {
  uploadVideo,
  getVideos,
  getVideo,
  deleteVideo,
  streamVideo
} from '../controllers/videoController.js';
import { protect, authorize, tenantIsolation } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.use(tenantIsolation);

router.post('/upload', authorize('editor', 'admin'), upload, uploadVideo);
router.get('/', getVideos);
router.get('/:id', getVideo);
router.get('/:id/stream', protect, streamVideo);
router.delete('/:id', authorize('editor', 'admin'), deleteVideo);

export default router;

