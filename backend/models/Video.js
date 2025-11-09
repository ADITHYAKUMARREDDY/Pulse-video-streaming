import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  processedFilePath: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed', 'flagged'],
    default: 'uploading'
  },
  sensitivityStatus: {
    type: String,
    enum: ['safe', 'flagged', 'pending'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    bitrate: { type: Number, default: null },
    codec: { type: String, default: null }
  },
  analysisResults: {
    confidence: { type: Number, default: null },
    framesAnalyzed: { type: Number, default: 0 },
    analysisNote: { type: String, default: null }
  },
  errorMessage: {
    type: String,
    default: null
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
videoSchema.index({ tenantId: 1, uploadedAt: -1 });
videoSchema.index({ tenantId: 1, sensitivityStatus: 1 });
videoSchema.index({ uploadedBy: 1 });

const Video = mongoose.model('Video', videoSchema);

export default Video;




