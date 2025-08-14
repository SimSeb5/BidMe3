import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const PublicHome = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    recentRequests: []
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const [requestsResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API}/service-requests?status=open`),
        axios.get(`${API}/categories`)
      ]);

      setStats({
        totalRequests: requestsResponse.data.length,
        recentRequests: requestsResponse.data.slice(0, 6)
      });
      setCategories(categoriesResponse.data.categories);
    } catch (error) {
      console.error('Failed to fetch public data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="hero-clean">
        <div className="hero-content-clean">
          <div className="text-center mb-8">
            <h1 className="hero-title">
              Welcome to <span className="text-yellow-300">BidMe</span>
            </h1>
            <p className="hero-subtitle">
              Where great projects meet skilled professionals. Post your task, get competitive bids, and hire the perfect match.
            </p>
          </div>
          
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-large">
              Get Started
            </Link>
            <Link to="/services" className="btn btn-secondary btn-large">
              Browse Projects
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Public Stats */}
        <div className="stats-clean">
          <div className="stat-card-clean">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <span className="stat-number">{stats.totalRequests}</span>
              <span className="stat-label">Active Projects</span>
            </div>
          </div>
          
          <div className="stat-card-clean">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <span className="stat-number">{categories.length}</span>
              <span className="stat-label">Service Categories</span>
            </div>
          </div>
          
          <div className="stat-card-clean">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <span className="stat-number">Verified</span>
              <span className="stat-label">Professionals</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="section-clean">
          <h2 className="section-title">How BidMe Works</h2>
          <div className="quick-actions">
            <div className="action-card">
              <div className="action-icon">📝</div>
              <h3>Post Your Project</h3>
              <p>Describe what you need and set your budget</p>
            </div>
            <div className="action-card">
              <div className="action-icon">💰</div>
              <h3>Receive Bids</h3>
              <p>Get competitive proposals from qualified professionals</p>
            </div>
            <div className="action-card">
              <div className="action-icon">🤝</div>
              <h3>Choose & Connect</h3>
              <p>Select the best proposal and start your project</p>
            </div>
          </div>
        </div>

        {/* Service Categories */}
        <div className="section-clean">
          <h2 className="section-title">Popular Service Categories</h2>
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
          
          <div className="text-center mt-6">
            <Link to="/services" className="btn btn-outline">
              View All Categories
            </Link>
          </div>
        </div>

        {/* Recent Projects Preview */}
        {stats.recentRequests.length > 0 && (
          <div className="section-clean">
            <div className="section-header">
              <h2 className="section-title">Latest Project Opportunities</h2>
              <Link to="/services" className="btn btn-outline">
                View All Projects
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
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="section-clean text-center">
          <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 mb-6">
              Join thousands of customers and service providers on BidMe
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/register" className="btn btn-primary btn-large">
                Sign Up Now
              </Link>
              <Link to="/login" className="btn btn-outline btn-large">
                Already have an account?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicHome;