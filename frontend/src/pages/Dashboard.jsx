import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Dashboard.css';

const Dashboard = () => {
  const [videos, setVideos] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    flagged: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (socket) {
      // Listen for video processing updates
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

    // Refresh stats
    fetchVideos();
  };

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos?limit=10');
      setVideos(response.data.videos);
      
      // Calculate stats
      const total = response.data.total;
      const processing = response.data.videos.filter(v => v.status === 'processing' || v.status === 'uploading').length;
      const completed = response.data.videos.filter(v => v.status === 'completed').length;
      const flagged = response.data.videos.filter(v => v.sensitivityStatus === 'flagged').length;
      
      setStats({ total, processing, completed, flagged });
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p className="dashboard-subtitle">Welcome back, {user?.username}!</p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Videos</h3>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Processing</h3>
          <p className="stat-number">{stats.processing}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-number">{stats.completed}</p>
        </div>
        <div className="stat-card">
          <h3>Flagged</h3>
          <p className="stat-number">{stats.flagged}</p>
        </div>
      </div>

      <div className="recent-videos">
        <div className="section-header">
          <h2>Recent Videos</h2>
          <Link to="/videos" className="btn-link">View All</Link>
        </div>

        {videos.length === 0 ? (
          <div className="empty-state">
            <p>No videos uploaded yet.</p>
            {(user?.role === 'editor' || user?.role === 'admin') && (
              <Link to="/videos/upload" className="btn-primary">
                Upload Your First Video
              </Link>
            )}
          </div>
        ) : (
          <div className="video-grid">
            {videos.map(video => (
              <div key={video._id} className="video-card">
                <div className="video-card-header">
                  <h3>{video.originalName}</h3>
                  <span className={`status-badge ${getStatusBadge(video.status)}`}>
                    {video.status}
                  </span>
                </div>
                <div className="video-card-body">
                  <p className="video-info">
                    <span>Size: {formatFileSize(video.fileSize)}</span>
                    <span>Sensitivity: {video.sensitivityStatus || 'pending'}</span>
                  </p>
                  {video.status === 'processing' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${video.processingProgress || 0}%` }}
                      />
                      <span className="progress-text">{video.processingProgress || 0}%</span>
                    </div>
                  )}
                  {(video.status === 'completed' || video.status === 'flagged') && (
                    <Link to={`/videos/${video._id}`} className="btn-primary">
                      Watch Video
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

