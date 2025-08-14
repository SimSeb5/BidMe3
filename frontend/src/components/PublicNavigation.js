import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const PublicNavigation = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav-clean">
      <div className="nav-container-clean">
        <Link to="/" className="nav-brand-clean">
          <span className="brand-icon">⚡</span>
          BidMe
        </Link>
        
        <div className="nav-links-clean">
          <Link 
            to="/" 
            className={`nav-link-clean ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          
          <Link 
            to="/services" 
            className={`nav-link-clean ${isActive('/services') ? 'active' : ''}`}
          >
            Browse Services
          </Link>
          
          <Link 
            to="/providers" 
            className={`nav-link-clean ${isActive('/providers') ? 'active' : ''}`}
          >
            Browse Providers
          </Link>
          
          <div className="nav-auth-buttons">
            <Link to="/login" className="btn btn-outline">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavigation;