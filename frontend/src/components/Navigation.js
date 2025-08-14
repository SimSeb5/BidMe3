import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          ServiceConnect
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden btn btn-outline p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Desktop navigation */}
        <ul className="nav-links hidden md:flex">
          <li>
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
          
          {user?.role === 'customer' && (
            <>
              <li>
                <Link 
                  to="/request-service" 
                  className={`nav-link ${isActive('/request-service') ? 'active' : ''}`}
                >
                  Request Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/my-requests" 
                  className={`nav-link ${isActive('/my-requests') ? 'active' : ''}`}
                >
                  My Requests
                </Link>
              </li>
            </>
          )}
          
          {user?.role === 'provider' && (
            <>
              <li>
                <Link 
                  to="/my-bids" 
                  className={`nav-link ${isActive('/my-bids') ? 'active' : ''}`}
                >
                  My Bids
                </Link>
              </li>
              <li>
                <Link 
                  to="/profile" 
                  className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                >
                  Profile
                </Link>
              </li>
            </>
          )}
          
          <li>
            <Link 
              to="/services" 
              className={`nav-link ${isActive('/services') ? 'active' : ''}`}
            >
              Browse Services
            </Link>
          </li>
          
          <li>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden lg:block">
                Welcome, {user?.first_name}!
              </span>
              <span className={`badge ${user?.role === 'provider' ? 'badge-in-progress' : 'badge-open'}`}>
                {user?.role}
              </span>
              <button 
                onClick={logout} 
                className="btn btn-outline text-sm py-2 px-3"
              >
                Logout
              </button>
            </div>
          </li>
        </ul>
        
        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden w-full bg-white border-t border-gray-200 py-4">
            <div className="flex flex-col gap-2">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              
              {user?.role === 'customer' && (
                <>
                  <Link 
                    to="/request-service" 
                    className={`nav-link ${isActive('/request-service') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Request Service
                  </Link>
                  <Link 
                    to="/my-requests" 
                    className={`nav-link ${isActive('/my-requests') ? 'active' : ''}`}
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
                    className={`nav-link ${isActive('/my-bids') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bids
                  </Link>
                  <Link 
                    to="/profile" 
                    className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </>
              )}
              
              <Link 
                to="/services" 
                className={`nav-link ${isActive('/services') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Services
              </Link>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {user?.first_name}
                  </span>
                  <span className={`badge ${user?.role === 'provider' ? 'badge-in-progress' : 'badge-open'}`}>
                    {user?.role}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }} 
                  className="btn btn-outline text-sm py-2 px-3"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;