import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './VideoLibrary.css';

const VideoLibrary = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    sensitivityStatus: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    fetchVideos();
  }, [filters, pagination.page]);

  useEffect(() => {
    if (socket) {
      // Listen for video updates
      const handleVideoUpdate = (data) => {
        setVideos(prevVideos => {
          return prevVideos.map(video => {
            if (video._id === data.videoId) {
              return {
                ...video,
                status: data.status || video.status,
                sensitivityStatus: data.sensitivityStatus || video.sensitivityStatus,
                processingProgress: data.progress !== undefined ? data.progress : video.processingProgress
              };
            }
            return video;
          });
        });
      };

      socket.on('video:processing', handleVideoUpdate);
      socket.on('video:progress', handleVideoUpdate);
      socket.on('video:completed', handleVideoUpdate);
      socket.on('video:error', handleVideoUpdate);

      return () => {
        socket.off('video:processing', handleVideoUpdate);
        socket.off('video:progress', handleVideoUpdate);
        socket.off('video:completed', handleVideoUpdate);
        socket.off('video:error', handleVideoUpdate);
      };
    }
  }, [socket]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.sensitivityStatus) params.append('sensitivityStatus', filters.sensitivityStatus);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get('/api/videos', { params });
      console.log('API Response:', response.data);
      console.log('API Response:', response.data);
      console.log('Fetched videos:', response.data.videos);
      setVideos(response.data.videos);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        pages: response.data.pages
      }));
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await axios.delete(`/api/videos/${videoId}`);
      fetchVideos();
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

  if (loading && videos.length === 0) {
    return <div className="loading">Loading videos...</div>;
  }

  return (
    <div className="video-library">
      <div className="library-header">
        <h1>Video Library</h1>
        {(user?.role === 'editor' || user?.role === 'admin') && (
          <Link to="/videos/upload" className="btn-primary">
            Upload Video
          </Link>
        )}
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search videos..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="uploading">Uploading</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sensitivity</label>
          <select
            value={filters.sensitivityStatus}
            onChange={(e) => handleFilterChange('sensitivityStatus', e.target.value)}
          >
            <option value="">All</option>
            <option value="safe">Safe</option>
            <option value="flagged">Flagged</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p>No videos found.</p>
          {(user?.role === 'editor' || user?.role === 'admin') && (
            <Link to="/videos/upload" className="btn-primary">
              Upload Your First Video
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map(video => (
              <div key={video._id} className="video-card">
                <div className="video-card-header">
                  <h3 title={video.originalName}>
                    {video.originalName.length > 30
                      ? video.originalName.substring(0, 30) + '...'
                      : video.originalName}
                  </h3>
                  <div className="badges">
                    <span className={`status-badge ${getStatusBadge(video.status)}`}>
                      {video.status}
                    </span>
                    <span className={`sensitivity-badge ${getSensitivityBadge(video.sensitivityStatus)}`}>
                      {video.sensitivityStatus || 'pending'}
                    </span>
                  </div>
                </div>
                <div className="video-card-body">
                  <div className="video-details">
                    <p><strong>Size:</strong> {formatFileSize(video.fileSize)}</p>
                    <p><strong>Uploaded:</strong> {formatDate(video.uploadedAt)}</p>
                    {video.uploadedBy && (
                      <p><strong>Uploaded by:</strong> {video.uploadedBy.username}</p>
                    )}
                  </div>
                  {video.status === 'processing' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${video.processingProgress || 0}%` }}
                      />
                      <span className="progress-text">{video.processingProgress || 0}%</span>
                    </div>
                  )}
                  <div className="video-actions">
                    {(video.status === 'completed' || video.status === 'flagged') && (
                      <Link to={`/videos/${video._id}`} className="btn-primary btn-sm">
                        Watch
                      </Link>
                    )}
                    {(user?.role === 'editor' || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDelete(video._id)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoLibrary;

