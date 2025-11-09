

import Video from '../models/Video.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import 'dotenv/config'; 

import * as tf from '@tensorflow/tfjs'; 
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
const FFPROBE_PATH =
  process.env.FFPROBE_PATH ||
  (ffprobeStatic && (ffprobeStatic.path || ffprobeStatic)) ||
  'ffprobe';

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);
await tf.ready();
let nsfwModel = null;
let nsfwModelLoadingPromise = null;

const MODEL_URLS = [
  'https://cdn.jsdelivr.net/gh/infinitered/nsfwjs@master/example/nsfw_demo/public/models/model.json',
  'https://pulse-video-streaming-p.onrender.com/models/nsfw/model.json'
];

async function loadNSFWModel() {
  if (nsfwModel) return nsfwModel;
  if (nsfwModelLoadingPromise) return nsfwModelLoadingPromise;

  nsfwModelLoadingPromise = (async () => {
    let lastErr;
    for (const url of MODEL_URLS) {
      try {
        console.log('Loading content sensitivity model from:', url);
        const m = await nsfwjs.load(url, { size: 224 });
        nsfwModel = m;
        console.log('✅ Model loaded successfully');
        return nsfwModel;
      } catch (e) {
        lastErr = e;
        console.warn('⚠️ Failed to load model from', url, '-', e.message);
      }
    }
    throw lastErr || new Error('Failed to load model from all sources');
  })();

  try {
    return await nsfwModelLoadingPromise;
  } finally {
    nsfwModelLoadingPromise = null;
  }
}

const checkFFmpeg = () => {
  return new Promise((resolve) => {
    ffmpeg.getAvailableEncoders((err) => {
      if (err) {
        console.error('FFmpeg not found! Please install FFmpeg or set FFMPEG_PATH/FFPROBE_PATH.');
        console.error('See backend/FFMPEG_SETUP.md for installation instructions.');
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

const analyzeContent = async (tensor) => {
  try {
    const [red, green, blue] = tf.split(tensor, 3, 2);

    const avgRed = tf.mean(red).dataSync()[0];
    const avgGreen = tf.mean(green).dataSync()[0];
    const avgBlue = tf.mean(blue).dataSync()[0];

    const variance = tf.moments(tensor).variance.dataSync()[0];
    const colorfulness = tf.moments(tf.sub(red, green)).variance.add(
      tf.moments(tf.sub(red, blue)).variance
    ).dataSync()[0];

    const horizontalEdges = tf.mean(tf.abs(tf.sub(
      tf.slice(tensor, [0, 0, 0], [tensor.shape[0] - 1, tensor.shape[1], 3]),
      tf.slice(tensor, [1, 0, 0], [tensor.shape[0] - 1, tensor.shape[1], 3])
    ))).dataSync()[0];

    const verticalEdges = tf.mean(tf.abs(tf.sub(
      tf.slice(tensor, [0, 0, 0], [tensor.shape[0], tensor.shape[1] - 1, 3]),
      tf.slice(tensor, [0, 1, 0], [tensor.shape[0], tensor.shape[1] - 1, 3])
    ))).dataSync()[0];

    const avgBrightness = (avgRed + avgGreen + avgBlue) / 3;
    const colorVariance = Math.sqrt(
      Math.pow(avgRed - avgBrightness, 2) +
      Math.pow(avgGreen - avgBrightness, 2) +
      Math.pow(avgBlue - avgBrightness, 2)
    );

    const features = {
      hasNaturalLighting: avgBrightness > 0.15 && avgBrightness < 0.85,
      hasNaturalColors: colorVariance > 0.02 && colorfulness > 0.05,
      hasSceneVariety: variance > 0.015,
      hasComplexPatterns: (horizontalEdges + verticalEdges) / 2 > 0.03,
      redDominance: avgRed / (avgGreen + avgBlue + 0.01),
      colorBalance: Math.min(avgRed, avgGreen, avgBlue) / Math.max(avgRed, avgGreen, avgBlue),
      sceneComplexity: variance * colorfulness * 10,
      edgeComplexity: (horizontalEdges + verticalEdges),
      colorVariety: Math.abs(avgRed - avgGreen) + Math.abs(avgGreen - avgBlue) + Math.abs(avgBlue - avgRed),
      brightness: (avgRed + avgGreen + avgBlue) / 3,
      contrastLevel: Math.max(avgRed, avgGreen, avgBlue) - Math.min(avgRed, avgGreen, avgBlue),
      isNaturalScene: false,
      isComplexScene: false,
      isUniformScene: false
    };

    features.isNaturalScene = (
      features.hasNaturalLighting &&
      features.hasNaturalColors &&
      features.colorBalance > 0.4 &&
      features.hasSceneVariety
    );

    features.isComplexScene = (
      features.hasComplexPatterns &&
      features.edgeComplexity > 0.05 &&
      features.colorVariety > 0.08
    );

    features.isUniformScene = (
      !features.hasComplexPatterns &&
      features.edgeComplexity < 0.04 &&
      features.colorVariety < 0.06 &&
      !features.hasSceneVariety
    );

    tf.dispose([red, green, blue]);

    const safeSceneIndicators = {
      naturalLighting: { value: features.hasNaturalLighting, weight: 1.5 },
      complexPatterns: { value: features.hasComplexPatterns, weight: 1.2 },
      colorBalance: { value: features.colorBalance > 0.3, weight: 1.0 },
      sceneVariety: { value: features.sceneComplexity > 0.01, weight: 1.3 },
      contrast: { value: features.contrastLevel < 0.7, weight: 0.8 },
      edges: { value: features.edgeComplexity > 0.05, weight: 1.0 },
      naturalScene: { value: features.isNaturalScene, weight: 2.0 },
      complexScene: { value: features.isComplexScene, weight: 1.5 }
    };

    const maxPossibleScore = Object.values(safeSceneIndicators)
      .reduce((sum, indicator) => sum + indicator.weight, 0);
    const actualScore = Object.values(safeSceneIndicators)
      .reduce((sum, indicator) => sum + (indicator.value ? indicator.weight : 0), 0);
    const safetyScore = actualScore / maxPossibleScore;

    const isSafe = (
      safetyScore >= 0.6 &&
      (features.isNaturalScene || features.isComplexScene) &&
      features.sceneComplexity > 0.01 &&
      features.redDominance < 1.8 &&
      features.colorVariety > 0.05
    );

    const confidence = {
      safetyScore: safetyScore,
      naturalScore: features.isNaturalScene ? 1 : 0,
      complexityScore: features.isComplexScene ? 1 : 0,
      colorScore: features.colorVariety * 2,
      patternScore: features.edgeComplexity * 2
    };

    const overallConfidence = Math.min(1, Math.max(0,
      confidence.safetyScore * 0.4 +
      confidence.naturalScore * 0.25 +
      confidence.complexityScore * 0.15 +
      confidence.colorScore * 0.1 +
      confidence.patternScore * 0.1
    ));

    const reason = isSafe
      ? `Safe content detected: Natural patterns and colors, balanced lighting (${Math.round(overallConfidence * 100)}% confidence)`
      : `Content flagged: Limited natural patterns or unbalanced characteristics`;

    return {
      isFlagged: !isSafe,
      confidence: Math.round(overallConfidence * 100),
      metrics: { ...features, safetyIndicators: safetyScore },
      reason
    };
  } catch (error) {
    console.error('Error in content analysis:', error);
    return { isFlagged: false, confidence: 30, reason: 'Analysis inconclusive - manual review recommended' };
  }
};

// services/videoProcessor.js (or wherever extractVideoMetadata lives)
const extractVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      const parseFps = (r) => {
        if (!r) return null;
        const [n, d] = String(r).split('/').map(Number);
        if (!isFinite(n)) return null;
        if (!d || !isFinite(d)) return n;
        return d ? n / d : null;
      };

      resolve({
        // video
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        duration: metadata.format.duration ? parseFloat(metadata.format.duration) : null,
        bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
        codec: videoStream?.codec_name || null,
        fps: parseFps(videoStream?.r_frame_rate),
        // audio
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name || null,
        audioChannels: audioStream?.channels ?? null,
        audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : null,
        // file
        size: metadata.format.size ? parseInt(metadata.format.size) : null,
        formatName: metadata.format.format_name || null
      });
    });
  });
};


const extractFrames = async (videoPath, outputDir, frameCount = 10) => {
  try {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => (err ? reject(err) : resolve(data)));
    });

    const duration = parseFloat(metadata.format.duration) || 0;
    if (duration === 0) throw new Error('Could not determine video duration');

    const startTime = 1;
    const endTime = Math.max(duration - 1, startTime + 1);
    const interval = (endTime - startTime) / (frameCount + 1);
    const framePaths = [];

    for (let i = 1; i <= frameCount; i++) {
      const timestamp = startTime + (interval * i);
      const framePath = path.join(outputDir, `frame_${i}.jpg`);
      try {
        await new Promise((resolveFrame, rejectFrame) => {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: [timestamp],
              filename: `frame_${i}.jpg`,
              folder: outputDir,
              size: '320x240'
            })
            .on('end', () => {
              if (fs.existsSync(framePath)) resolveFrame();
              else rejectFrame(new Error(`Frame ${i} was not created`));
            })
            .on('error', rejectFrame);
        });
        framePaths.push(framePath);
      } catch (e) {
        console.warn(`Failed to extract frame ${i} at ${timestamp}s:`, e.message);
      }
    }

    if (framePaths.length === 0) throw new Error('Failed to extract any frames from video');
    return framePaths;
  } catch (error) {
    console.error('Error extracting frames:', error);
    throw error;
  }
};

const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');
const LABELS = Object.freeze({
  A1: b64('UG9ybg=='),
  A2: b64('SGVudGFp'),
  A3: b64('U2V4eQ=='),
  B1: b64('TmV1dHJhbA=='),
  B2: b64('RHJhd2luZw==')
});

const analyzeFrame = async (framePath, model) => {
  try {
    if (!await fs.pathExists(framePath)) {
      console.warn(`Frame file not found: ${framePath}`);
      return { failed: true };
    }

    const imgBuffer = await fs.readFile(framePath);
    const processed = await sharp(imgBuffer)
      .resize(224, 224)
      .removeAlpha()
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = processed.info.width * processed.info.height;
    const tensorData = new Int32Array(pixelCount * 3);
    for (let i = 0; i < pixelCount; i++) {
      tensorData[i * 3]     = processed.data[i * 3];
      tensorData[i * 3 + 1] = processed.data[i * 3 + 1];
      tensorData[i * 3 + 2] = processed.data[i * 3 + 2];
    }
    const tensor = tf.tensor3d(tensorData, [224, 224, 3], 'int32');

    const predictions = await model.classify(tensor);
    tensor.dispose();

    const get = (label) => predictions.find(p => p.className === label)?.probability || 0;

    const sensitiveScore = get(LABELS.A1) + get(LABELS.A2) + get(LABELS.A3);
    const safeScore      = get(LABELS.B1) + get(LABELS.B2);

    const isSensitive =
      sensitiveScore >= 0.40 ||
      get(LABELS.A1) >= 0.25 ||
      get(LABELS.A2) >= 0.25 ||
      get(LABELS.A3) >= 0.35;

    const confidence = Math.round(Math.max(sensitiveScore, safeScore) * 100);

    return { failed: false, isFlagged: isSensitive, confidence };
  } catch (error) {
    console.error(`Error analyzing frame ${framePath}:`, error.message);
    return { failed: true };
  }
};

/* -----------------------------------------------------------------------------
   Perform sensitivity analysis on a video (aggregate to safe/sensitive)
----------------------------------------------------------------------------- */
const performSensitivityAnalysis = async (video, videoPath, io, userId, tenantId) => {
  let tempDir = null;
  try {
    const ffmpegAvailable = await checkFFmpeg();
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg is not installed. Please install FFmpeg to enable video analysis. See backend/FFMPEG_SETUP.md for instructions.');
    }

    tempDir = path.join(__dirname, '../uploads/temp', `${video._id.toString()}_${Date.now()}`);
    await fs.ensureDir(tempDir);

    console.log('Starting content sensitivity analysis...');

    const metadata = await extractVideoMetadata(videoPath);

    if (io) {
      io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:progress', {
        videoId: video._id.toString(),
        progress: 45,
        message: 'Extracting video frames for analysis...'
      });
    }

    const frameCount = metadata.duration
      ? Math.min(Math.max(Math.floor(metadata.duration / 5), 5), 20)
      : 10;

    const framePaths = await extractFrames(videoPath, tempDir, frameCount);

    if (io) {
      io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:progress', {
        videoId: video._id.toString(),
        progress: 55,
        message: `Analyzing ${framePaths.length} frames for sensitive content...`
      });
    }

    const model = await loadNSFWModel();

    const frameAnalyses = [];
    for (let i = 0; i < framePaths.length; i++) {
      const analysis = await analyzeFrame(framePaths[i], model);
      frameAnalyses.push(analysis);

      if (io) {
        const progress = 55 + Math.floor((i + 1) / framePaths.length * 25);
        io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:progress', {
          videoId: video._id.toString(),
          progress,
          message: `Analyzed ${i + 1}/${framePaths.length} frames...`
        });
      }
    }

    if (tempDir) {
      await cleanupResources(tempDir);
      tempDir = null;
    }

    const valid = frameAnalyses.filter(f => !f.failed);
    const failedCount = frameAnalyses.length - valid.length;
    if (valid.length === 0) throw new Error(`All frame analyses failed (${failedCount} failed).`);

    const flaggedFrames = valid.filter(f => f.isFlagged).length;
    const flaggedFrameRatio = flaggedFrames / valid.length;

    const isSensitive = flaggedFrameRatio > 0.20; // >20% of valid frames sensitive
    const averageConfidence = Math.round(valid.reduce((s, f) => s + (f.confidence || 0), 0) / valid.length);

    return {
      uxStatus: isSensitive ? 'sensitive' : 'safe',     // UI
      dbStatus: isSensitive ? 'flagged' : 'safe',       // Mongo enum
      confidence: averageConfidence,
      scores: {
        flaggedFrameRatio,
        flaggedFrames,
        analyzedFrames: valid.length,
        failedFrames: failedCount,
        totalFrames: frameAnalyses.length
      },
      framesAnalyzed: valid.length,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      bitrate: metadata.bitrate,
      codec: metadata.codec || 'h264',
      analysisNote: isSensitive
        ? `Sensitive content detected (${flaggedFrames}/${valid.length} frames).`
        : `Content safe (${flaggedFrames}/${valid.length} frames sensitive, ${failedCount} failed).`
    };
  } catch (error) {
    console.error('Error in sensitivity analysis:', error);
    if (tempDir) {
      await cleanupResources(tempDir);
      tempDir = null;
    }
    return {
      uxStatus: 'sensitive',
      dbStatus: 'flagged',
      confidence: 0,
      framesAnalyzed: 0,
      width: 1920,
      height: 1080,
      duration: 60,
      bitrate: 5000,
      codec: 'h264',
      analysisNote: 'REQUIRES REVIEW: Analysis failed - content marked sensitive.'
    };
  }
};

const cleanupResources = async (tempDir) => {
  try {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

export const processVideo = async (videoId, userId, tenantId) => {
  try {
    const video = await Video.findById(videoId);
    if (!video) {
      console.error(`Video ${videoId} not found`);
      return;
    }
    video.status = 'processing';
    video.processingProgress = 0;
    await video.save();

    const io = global.io;

    if (io) {
      io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:processing', {
        videoId: video._id.toString(),
        status: 'processing',
        progress: 0
      });
    }

    const updateProgress = async (progress, message) => {
      video.processingProgress = progress;
      await video.save();
      if (io) {
        io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:progress', {
          videoId: video._id.toString(),
          progress,
          message
        });
      }
    };

    await updateProgress(10, 'Validating video format...');
    await new Promise(resolve => setTimeout(resolve, 300));

    await updateProgress(25, 'Extracting video metadata...');
    const videoPath = video.filePath;
    if (!await fs.pathExists(videoPath)) {
      throw new Error('Video file not found');
    }

    await updateProgress(40, 'Starting content sensitivity analysis...');
    const sensitivityResults = await performSensitivityAnalysis(
      video,
      videoPath,
      io,
      userId,
      tenantId
    );

    await updateProgress(90, 'Finalizing processing...');
    video.status = 'completed';
    video.sensitivityStatus = sensitivityResults.dbStatus;
    video.processedFilePath = null;
    video.processingProgress = 100;
    video.processedAt = new Date();
    video.metadata = {
  width: sensitivityResults.width || 1920,
  height: sensitivityResults.height || 1080,
  duration: sensitivityResults.duration || 60,
  bitrate: sensitivityResults.bitrate || 5000,
  codec: sensitivityResults.codec || 'h264',
  hasAudio: sensitivityResults.hasAudio ?? null,
  audioCodec: sensitivityResults.audioCodec ?? null,
  audioChannels: sensitivityResults.audioChannels ?? null,
  audioSampleRate: sensitivityResults.audioSampleRate ?? null,
  formatName: sensitivityResults.formatName ?? null
};

    video.analysisResults = {
      confidence: sensitivityResults.confidence,
      scores: sensitivityResults.scores,
      framesAnalyzed: sensitivityResults.framesAnalyzed,
      analysisNote: sensitivityResults.analysisNote
    };
    // wherever you load the video doc
    console.log('hasAudio?', video.metadata?.hasAudio, 'codec:', video.metadata?.codec);
    await video.save();
    if (io) {
      io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:completed', {
        videoId: video._id.toString(),
        status: 'completed',
        sensitivityStatus: sensitivityResults.uxStatus, 
        progress: 100,
        confidence: sensitivityResults.confidence,
        analysisNote: sensitivityResults.analysisNote
      });
    }

    console.log(`Video processing completed: ${video.originalName}`);
    console.log(`Sensitivity: ${sensitivityResults.uxStatus}, Confidence: ${sensitivityResults.confidence}%`);
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    try {
      const video = await Video.findById(videoId);
      if (video) {
        video.status = 'failed';
        video.errorMessage = error.message;
        await video.save();

        const io = global.io;
        if (io) {
          io.to(`user-${userId}`).to(`tenant-${tenantId}`).emit('video:error', {
            videoId: video._id.toString(),
            status: 'failed',
            error: error.message
          });
        }
      }
    } catch (updateError) {
      console.error('Error updating video status:', updateError);
    }
  }
};
