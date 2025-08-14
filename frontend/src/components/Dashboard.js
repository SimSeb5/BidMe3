import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalRequests: 0,
    myRequests: 0,
    myBids: 0,
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const userRoles = user.roles || [user.role]; // Support both old and new format
      const isCustomer = userRoles.includes('customer');
      const isProvider = userRoles.includes('provider');
      
      const [requestsResponse, myRequestsResponse, myBidsResponse] = await Promise.all([
        axios.get(`${API}/service-requests?status=open`),
        isCustomer ? axios.get(`${API}/my-requests`) : Promise.resolve({ data: [] }),
        isProvider ? axios.get(`${API}/my-bids`) : Promise.resolve({ data: [] })
      ]);

      setStats({
        totalRequests: requestsResponse.data.length,
        myRequests: myRequestsResponse.data.length,
        myBids: myBidsResponse.data.length,
        recentRequests: requestsResponse.data.slice(0, 3)
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Support both old and new role formats
  const userRoles = user.roles || [user.role];
  const isCustomer = userRoles.includes('customer');
  const isProvider = userRoles.includes('provider');
  const primaryRole = isProvider ? 'provider' : 'customer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Hero Section */}
      <div className="hero-clean">
        <div className="hero-content-clean">
          <div className="text-center mb-8">
            <h1 className="hero-title">
              {primaryRole === 'customer' 
                ? 'Find Professional Services' 
                : 'Grow Your Business'
              }
            </h1>
            <p className="hero-subtitle">
              {primaryRole === 'customer'
                ? 'Connect with verified professionals and get competitive bids for your projects'
                : 'Discover new opportunities and submit winning proposals'
              }
            </p>
          </div>
          
          <div className="hero-actions">
            {isCustomer && (
              <>
                <Link to="/request-service" className="btn btn-primary btn-large">
                  Post a Request
                </Link>
                <Link to="/services" className="btn btn-secondary btn-large">
                  Browse Services
                </Link>
              </>
            )}
            {isProvider && !isCustomer && (
              <>
                <Link to="/services" className="btn btn-primary btn-large">
                  Find Projects
                </Link>
                <Link to="/profile" className="btn btn-secondary btn-large">
                  Update Profile
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Clean Stats - Only show relevant metrics */}
        <div className="stats-clean">
          <div className="stat-card-clean">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <span className="stat-number">{stats.totalRequests}</span>
              <span className="stat-label">Active Projects</span>
            </div>
          </div>
          
          {isCustomer && (
            <div className="stat-card-clean">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <span className="stat-number">{stats.myRequests}</span>
                <span className="stat-label">My Requests</span>
              </div>
            </div>
          )}
          
          {isProvider && (
            <div className="stat-card-clean">
              <div className="stat-icon">💼</div>
              <div className="stat-content">
                <span className="stat-number">{stats.myBids}</span>
                <span className="stat-label">My Proposals</span>
              </div>
            </div>
          )}
        </div>

        {/* Service Categories - Cleaner Grid */}
        <div className="section-clean">
          <h2 className="section-title">Browse by Category</h2>
          <div className="categories-grid">
            {categories.slice(0, 6).map((category, index) => (
              <Link
                key={index}
                to={`/services?category=${encodeURIComponent(category)}`}
                className="category-card"
              >
                <div className="category-icon">
                  {getCategoryIcon(category)}
                </div>
                <h3 className="category-name">{category}</h3>
              </Link>
            ))}
          </div>
          
          {categories.length > 6 && (
            <div className="text-center mt-6">
              <Link to="/services" className="btn btn-outline">
                View All Categories
              </Link>
            </div>
          )}
        </div>

        {/* Recent Projects - Cleaner Layout */}
        {stats.recentRequests.length > 0 && (
          <div className="section-clean">
            <div className="section-header">
              <h2 className="section-title">Latest Opportunities</h2>
              <Link to="/services" className="btn btn-outline">
                View All
              </Link>
            </div>
            
            <div className="projects-grid">
              {stats.recentRequests.map((request) => (
                <div key={request.id} className="project-card">
                  <div className="project-header">
                    <h3 className="project-title">{request.title}</h3>
                    <span className="project-category">{request.category}</span>
                  </div>
                  
                  <p className="project-description">{request.description}</p>
                  
                  <div className="project-meta">
                    {request.budget_min && request.budget_max && (
                      <div className="project-budget">
                        ${request.budget_min} - ${request.budget_max}
                      </div>
                    )}
                    <div className="project-bids">
                      {request.bid_count} proposals
                    </div>
                  </div>
                  
                  <Link 
                    to={`/services/${request.id}`} 
                    className="btn btn-primary btn-sm w-full"
                  >
                    {isProvider ? 'Submit Proposal' : 'View Details'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="section-clean text-center">
          <h2 className="section-title">Get Started</h2>
          <div className="quick-actions">
            {isCustomer && (
              <>
                <div className="action-card">
                  <div className="action-icon">📝</div>
                  <h3>Post a Request</h3>
                  <p>Describe your project and get competitive bids</p>
                  <Link to="/request-service" className="btn btn-primary">
                    Start Now
                  </Link>
                </div>
                <div className="action-card">
                  <div className="action-icon">👥</div>
                  <h3>Browse Providers</h3>
                  <p>Find the perfect professional for your needs</p>
                  <Link to="/services" className="btn btn-secondary">
                    Explore
                  </Link>
                </div>
              </>
            )}
            {isProvider && (
              <>
                <div className="action-card">
                  <div className="action-icon">🔍</div>
                  <h3>Find Projects</h3>
                  <p>Discover opportunities that match your skills</p>
                  <Link to="/services" className="btn btn-primary">
                    Browse Now
                  </Link>
                </div>
                <div className="action-card">
                  <div className="action-icon">⭐</div>
                  <h3>Build Profile</h3>
                  <p>Showcase your expertise and get verified</p>
                  <Link to="/profile" className="btn btn-secondary">
                    Update Profile
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get category icons
const getCategoryIcon = (category) => {
  const icons = {
    'Home Services': '🏠',
    'Construction & Renovation': '🔨',
    'Professional Services': '💼',
    'Technology & IT': '💻',
    'Creative & Design': '🎨',
    'Business Services': '📊',
    'Health & Wellness': '🏥',
    'Education & Training': '📚',
    'Transportation': '🚗',
    'Events & Entertainment': '🎉',
    'Other': '⚡'
  };
  return icons[category] || '⚡';
};

export default Dashboard;