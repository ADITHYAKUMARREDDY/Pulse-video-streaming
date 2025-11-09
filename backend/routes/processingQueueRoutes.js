import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  queueVideo,
  getProcessingStatus,
} from '../controllers/processingQueueController.js';

const router = express.Router();
router.post('/queue/:videoId', auth, queueVideo);
router.get('/status', auth, getProcessingStatus);
export default router;