import Video from '../models/Video.js';
import fs from 'fs-extra';
import { processVideo } from '../services/videoProcessor.js';

export const uploadVideo = async (req, res) => {
  try {
    console.log(
      'Uploading files:',
      (req.files || []).map(f => ({ name: f.originalname, size: f.size }))
    );

    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const uploadedVideos = [];

    for (const file of req.files || []) {
      const video = await Video.create({
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'uploading',
        sensitivityStatus: 'pending',
        processingProgress: 0,
        uploadedBy: userId,
        tenantId
      });

      Promise.resolve(processVideo(video._id.toString(), userId, tenantId)).catch(err =>
        console.error('processVideo error:', err)
      );

      uploadedVideos.push({
        id: video._id,
        filename: video.filename,
        originalName: video.originalName,
        fileSize: video.fileSize,
        status: video.status,
        processingProgress: video.processingProgress
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedVideos.length} video(s)`,
      videos: uploadedVideos
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error uploading video'
    });
  }
};

export const getVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;

    let query = { tenantId };

    if (userRole === 'viewer') {
      query = { tenantId };
    } else if (userRole === 'editor') {
      query = { tenantId, uploadedBy: userId };
    } else if (userRole === 'admin') {
      query = { tenantId };
    }

    const {
      status,
      sensitivityStatus,
      search,
      page = 1,
      limit = 10
    } = req.query;

    if (status) query.status = status;
    if (sensitivityStatus) query.sensitivityStatus = sensitivityStatus;
    if (search) query.originalName = { $regex: search, $options: 'i' };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('uploadedBy', 'username email')
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Video.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: videos.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      videos
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching videos'
    });
  }
};

export const getVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const tenantId = req.user.tenantId;

    const video = await Video.findById(videoId).populate(
      'uploadedBy',
      'username email'
    );

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (String(video.tenantId) !== String(tenantId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this video' });
    }

    return res.status(200).json({ success: true, video });
  } catch (error) {
    console.error('Get video error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching video'
    });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (String(video.tenantId) !== String(tenantId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this video' });
    }

    if (userRole === 'editor' && String(video.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own videos'
      });
    }

    if (video.filePath && (await fs.pathExists(video.filePath))) {
      await fs.remove(video.filePath);
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting video'
    });
  }
};

export const streamVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const tenantId = req.user.tenantId;

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Tenant isolation
    if (String(video.tenantId) !== String(tenantId)) {
      return res.status(403).json({ success: false, message: 'Access denied to this video' });
    }

    // Must be processed (or flagged) to stream
    if (video.status !== 'completed' && video.status !== 'flagged') {
      return res.status(400).json({ success: false, message: 'Video is still processing' });
    }

    const videoPath = video.processedFilePath || video.filePath;
    if (!videoPath || !(await fs.pathExists(videoPath))) {
      return res.status(404).json({ success: false, message: 'Video file not found' });
    }

    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;
    const mimeType = video.mimeType || 'video/mp4';
    const range = req.headers.range;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (isNaN(start) || isNaN(end) || start > end || end >= fileSize) {
        return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });

      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
      stream.on('error', err => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy(err);
        }
      });
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });

      const stream = fs.createReadStream(videoPath);
      stream.pipe(res);
      stream.on('error', err => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy(err);
        }
      });
    }
  } catch (error) {
    console.error('Streaming error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Error streaming video'
      });
    }
  }
};
