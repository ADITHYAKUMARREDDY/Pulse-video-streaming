import { processVideo } from '../services/videoProcessor.js';
import { queueVideoProcessing, getQueueStatus, pauseQueue, resumeQueue, clearQueue } from '../services/processingQueue.js';
import Video from '../models/Video.js';

// Queue a new video for processing
export const queueVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId, tenantId } = req.user;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Add to processing queue
    queueVideoProcessing(processVideo, videoId, userId, tenantId)
      .catch(error => {
        console.error(`Queue processing error for video ${videoId}:`, error);
      });

    res.status(200).json({
      message: 'Video queued for processing',
      queueStatus: getQueueStatus()
    });
  } catch (error) {
    console.error('Error queueing video:', error);
    res.status(500).json({ error: 'Failed to queue video for processing' });
  }
};

// Get current processing queue status
export const getProcessingStatus = async (req, res) => {
  try {
    const queueStatus = getQueueStatus();
    
    // Get all videos currently being processed
    const processingVideos = await Video.find({ status: 'processing' })
      .select('originalName processingProgress')
      .sort('-updatedAt');

    res.status(200).json({
      queueStatus,
      processingVideos
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get processing status' });
  }
};
