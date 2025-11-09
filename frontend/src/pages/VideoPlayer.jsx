import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { useAuth } from '../context/AuthContext';
import './VideoPlayer.css';

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await axios.get(`/api/videos/${id}`);
      setVideo(response.data.video);

      // Construct video URL for streaming with token
      // ReactPlayer needs the full URL with protocol and host
      const token = localStorage.getItem('token');
      const protocol = window.location.protocol;
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      // For development, use proxy. For production, use full URL or relative path
      const apiBase =  `https://pulse-video-streaming-p.onrender.com`;
      const url = `${apiBase}/api/videos/${id}/stream${token ? `?token=${token}` : ''}`;
      setVideoUrl(url);
    } catch (error) {
      console.error('Error fetching video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await axios.delete(`/api/videos/${id}`);
      navigate('/videos');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      uploading: 'bg-yellow',
      processing: 'bg-blue',
      completed: 'bg-green',
      failed: 'bg-red',
      flagged: 'bg-orange'
    };
    return badges[status] || 'bg-gray';
  };

  const getSensitivityBadge = (status) => {
    if (status === 'safe') return 'bg-green';
    if (status === 'flagged') return 'bg-red';
    return 'bg-gray';
  };

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

  if (error || !video) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Video not found'}</p>
        <Link to="/videos" className="btn-primary">Back to Videos</Link>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="player-header">
        <Link to="/videos" className="back-link">← Back to Videos</Link>
        {(user?.role === 'editor' || user?.role === 'admin') && (
          <button onClick={handleDelete} className="btn-danger">
            Delete Video
          </button>
        )}
      </div>

      <div className="player-container">
        <div className="player-wrapper">
          {video.status === 'completed' || video.status === 'flagged' ? (
            <ReactPlayer
              url={videoUrl}
              controls
              width="100%"
              height="100%"
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload'
                  },
                  forceVideo: true
                }
              }}
            />
          ) : (
            <div className="video-placeholder">
              <p>Video is {video.status}. Please wait for processing to complete.</p>
              {video.status === 'processing' && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${video.processingProgress || 0}%` }}
                  />
                  <span className="progress-text">{video.processingProgress || 0}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="video-info">
        <h2>{video.originalName}</h2>
        <div className="badges">
          <span className={`status-badge ${getStatusBadge(video.status)}`}>
            {video.status}
          </span>
          <span className={`sensitivity-badge ${getSensitivityBadge(video.sensitivityStatus)}`}>
            {video.sensitivityStatus || 'pending'}
          </span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <strong>File Size:</strong>
            <span>{formatFileSize(video.fileSize)}</span>
          </div>
          <div className="info-item">
            <strong>Uploaded:</strong>
            <span>{formatDate(video.uploadedAt)}</span>
          </div>
          {video.processedAt && (
            <div className="info-item">
              <strong>Processed:</strong>
              <span>{formatDate(video.processedAt)}</span>
            </div>
          )}
          {video.uploadedBy && (
            <div className="info-item">
              <strong>Uploaded by:</strong>
              <span>{video.uploadedBy.username}</span>
            </div>
          )}
          {video.metadata && (
            <>
              {video.metadata.width && video.metadata.height && (
                <div className="info-item">
                  <strong>Resolution:</strong>
                  <span>{video.metadata.width}x{video.metadata.height}</span>
                </div>
              )}
              {video.metadata.duration && (
                <div className="info-item">
                  <strong>Duration:</strong>
                  <span>{Math.round(video.metadata.duration)}s</span>
                </div>
              )}
            </>
          )}
        </div>

        {video.sensitivityStatus === 'flagged' && (
          <div className="warning-box">
            <strong>⚠️ Warning:</strong> This video has been flagged during sensitivity analysis.
            Please review the content before sharing.
          </div>
        )}

        {video.errorMessage && (
          <div className="error-box">
            <strong>Error:</strong> {video.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;

