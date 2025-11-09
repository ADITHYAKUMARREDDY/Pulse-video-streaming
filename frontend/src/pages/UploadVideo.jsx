import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import './UploadVideo.css';

const UploadVideo = () => {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket && videoId) {
      // Join video room for real-time updates
      socket.emit('video:join', videoId);

      // Listen for processing updates
      const handleProcessing = (data) => {
        if (data.videoId === videoId) {
          setProcessingStatus('Processing started...');
        }
      };

      const handleProgress = (data) => {
        if (data.videoId === videoId) {
          setProcessingProgress(data.progress);
          setProcessingStatus(data.message || 'Processing...');
        }
      };

      const handleCompleted = (data) => {
        if (data.videoId === videoId) {
          setProcessingProgress(100);
          setProcessingStatus('Processing completed!');
          setTimeout(() => {
            navigate(`/videos/${videoId}`);
          }, 2000);
        }
      };

      const handleError = (data) => {
        if (data.videoId === videoId) {
          setError(data.error || 'Processing failed');
          setProcessingStatus('Processing failed');
        }
      };

      socket.on('video:processing', handleProcessing);
      socket.on('video:progress', handleProgress);
      socket.on('video:completed', handleCompleted);
      socket.on('video:error', handleError);

      return () => {
        socket.off('video:processing', handleProcessing);
        socket.off('video:progress', handleProgress);
        socket.off('video:completed', handleCompleted);
        socket.off('video:error', handleError);
        socket.emit('video:leave', videoId);
      };
    }
  }, [socket, videoId, navigate]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const maxSize = 500 * 1024 * 1024;
    const validFiles = [];
    const errors = [];

    selectedFiles.forEach((file, index) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
      } else if (file.size > maxSize) {
        errors.push(`${file.name}: Exceeds 500MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    } else {
      setError('');
    }

    if (validFiles.length > 0) {
      setFiles(validFiles);
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one video file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStatus('');

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('videos', file);
    });

    try {
      const response = await axios.post('/api/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setSuccess(`Successfully uploaded ${files.length} video(s)!`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="upload-video">
      <h1>Upload Video</h1>

      <div className="upload-container">
        <div className="upload-card">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="upload-area">
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label htmlFor="video-upload" className="upload-label">
              {files.length > 0 ? (
                <div className="file-info">
                  <p className="file-name">
                    {files.length} video{files.length > 1 ? 's' : ''} selected
                  </p>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px' }}>
                    {files.map((file, index) => (
                      <div key={index} style={{ fontSize: '0.9rem', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                        <strong>{file.name}</strong> - {formatFileSize(file.size)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p>Click to select video files</p>
                  <p className="upload-hint">You can select multiple videos at once</p>
                  <p className="upload-hint">Supported formats: MP4, MPEG, MOV, AVI, WebM</p>
                  <p className="upload-hint">Max size per file: 500MB</p>
                </div>
              )}
            </label>
          </div>

          {files.length > 0 && !uploading && !videoId && (
            <button onClick={handleUpload} className="btn-primary btn-upload">
              Upload {files.length} Video{files.length > 1 ? 's' : ''}
            </button>
          )}

          {uploading && (
            <div className="progress-section">
              <h3>Uploading...</h3>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span className="progress-text">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {videoId && processingStatus && (
            <div className="progress-section">
              <h3>{processingStatus}</h3>
              <div className="progress-bar">
                <div
                  className="progress-fill processing"
                  style={{ width: `${processingProgress}%` }}
                />
                <span className="progress-text">{processingProgress}%</span>
              </div>
              {processingProgress === 100 && (
                <p className="processing-complete">Redirecting to video player...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;

