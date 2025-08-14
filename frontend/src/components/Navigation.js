import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

const Navigation = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          ServiceConnect
        </Link>
        
        <ul className="nav-links">
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
              <span className="text-sm text-gray-600">
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
      </div>
    </nav>
  );
};

export default Navigation;