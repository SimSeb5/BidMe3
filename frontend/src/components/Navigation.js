import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav-clean">
      <div className="nav-container-clean">
        <Link to="/" className="nav-brand-clean">
          <span className="brand-icon">⚡</span>
          ServiceConnect
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Desktop navigation */}
        <div className="nav-links-clean">
          <Link 
            to="/" 
            className={`nav-link-clean ${isActive('/') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          
          {user?.role === 'customer' && (
            <>
              <Link 
                to="/request-service" 
                className={`nav-link-clean ${isActive('/request-service') ? 'active' : ''}`}
              >
                Post Request
              </Link>
              <Link 
                to="/my-requests" 
                className={`nav-link-clean ${isActive('/my-requests') ? 'active' : ''}`}
              >
                My Requests
              </Link>
            </>
          )}
          
          {user?.role === 'provider' && (
            <>
              <Link 
                to="/my-bids" 
                className={`nav-link-clean ${isActive('/my-bids') ? 'active' : ''}`}
              >
                My Proposals
              </Link>
              <Link 
                to="/profile" 
                className={`nav-link-clean ${isActive('/profile') ? 'active' : ''}`}
              >
                Profile
              </Link>
            </>
          )}
          
          <Link 
            to="/services" 
            className={`nav-link-clean ${isActive('/services') ? 'active' : ''}`}
          >
            Browse
          </Link>
          
          <div className="nav-user-clean">
            <div className="user-info">
              <span className="user-name">{user?.first_name}</span>
              <span className={`user-role ${user?.role}`}>
                {user?.role === 'provider' ? 'Pro' : 'Client'}
              </span>
            </div>
            <button 
              onClick={logout} 
              className="logout-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <Link 
              to="/" 
              className={`mobile-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            
            {user?.role === 'customer' && (
              <>
                <Link 
                  to="/request-service" 
                  className={`mobile-link ${isActive('/request-service') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Post Request
                </Link>
                <Link 
                  to="/my-requests" 
                  className={`mobile-link ${isActive('/my-requests') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Requests
                </Link>
              </>
            )}
            
            {user?.role === 'provider' && (
              <>
                <Link 
                  to="/my-bids" 
                  className={`mobile-link ${isActive('/my-bids') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Proposals
                </Link>
                <Link 
                  to="/profile" 
                  className={`mobile-link ${isActive('/profile') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
            
            <Link 
              to="/services" 
              className={`mobile-link ${isActive('/services') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse
            </Link>
            
            <div className="mobile-user-info">
              <div className="mobile-user-details">
                <span className="mobile-user-name">{user?.first_name}</span>
                <span className={`mobile-user-role ${user?.role}`}>
                  {user?.role === 'provider' ? 'Professional' : 'Customer'}
                </span>
              </div>
              <button 
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }} 
                className="mobile-logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;