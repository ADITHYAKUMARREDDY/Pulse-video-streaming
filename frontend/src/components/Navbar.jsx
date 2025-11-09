import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Video Streaming
        </Link>
        {isAuthenticated ? (
          <div className="navbar-menu">
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
            <Link to="/videos" className="navbar-link">
              Videos
            </Link>
            {(user?.role === 'editor' || user?.role === 'admin') && (
              <Link to="/videos/upload" className="navbar-link">
                Upload
              </Link>
            )}
            <div className="navbar-user">
              <span className="navbar-username">{user?.username}</span>
              <span className="navbar-role">({user?.role})</span>
              <button onClick={handleLogout} className="navbar-logout">
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-menu">
            <Link to="/login" className="navbar-link">
              Login
            </Link>
            <Link to="/register" className="navbar-link">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

