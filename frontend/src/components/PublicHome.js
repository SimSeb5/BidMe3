import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const PublicHome = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    recentRequests: [],
    completedProjects: 0,
    verifiedProfessionals: 0
  });
  const [categories, setCategories] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const [requestsResponse, categoriesResponse, providersResponse] = await Promise.all([
        axios.get(`${API}/service-requests?status=open`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/service-providers?limit=50`)
      ]);

      // Calculate completed projects (simulate based on existing data)
      const allRequestsResponse = await axios.get(`${API}/service-requests?limit=100`);
      const completedProjects = allRequestsResponse.data.filter(req => req.status === 'completed').length + 847; // Add to existing count

      const verifiedCount = providersResponse.data.filter(provider => provider.verified).length;

      setStats({
        totalRequests: requestsResponse.data.length,
        recentRequests: requestsResponse.data.slice(0, 6),
        completedProjects: completedProjects,
        verifiedProfessionals: verifiedCount
      });
      setCategories(categoriesResponse.data.categories);
      setServiceProviders(providersResponse.data.slice(0, 8)); // Show top 8 providers
    } catch (error) {
      console.error('Failed to fetch public data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Home Services': '🏘️',
      'Construction & Renovation': '🏗️',
      'Professional Services': '💼',
      'Technology & IT': '💻',
      'Creative & Design': '🎨',
      'Business Services': '📊',
      'Health & Wellness': '🏥',
      'Education & Training': '📚',
      'Transportation': '🚛',
      'Events & Entertainment': '🎭',
      'Emergency Services': '🚨',
      'Automotive': '🚗',
      'Beauty & Personal Care': '💅',
      'Pet Services': '🐕',
      'Financial Services': '💳',
      'Other': '⚙️'
    };
    return icons[category] || '⚙️';
  };

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars > 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    return stars.join('');
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
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <span className="stat-number">{stats.totalRequests}</span>
              <span className="stat-label">Services Needed</span>
            </div>
          </div>
          
          <div className="stat-card-clean">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-number">{stats.completedProjects}</span>
              <span className="stat-label">Completed Projects</span>
            </div>
          </div>
          
          <div className="stat-card-clean">
            <div className="stat-icon">🛡️</div>
            <div className="stat-content">
              <span className="stat-number">{stats.verifiedProfessionals}</span>
              <span className="stat-label">Verified Professionals</span>
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

        {/* Featured Service Providers */}
        {serviceProviders.length > 0 && (
          <div className="section-clean">
            <h2 className="section-title">Featured Service Providers</h2>
            <div className="grid grid-4 gap-6">
              {serviceProviders.map((provider) => (
                <div key={provider.id} className="card hover-lift">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                        {provider.business_name}
                      </h3>
                      {provider.verified && (
                        <span className="badge badge-success text-xs">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                      {provider.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">
                          {renderStarRating(provider.google_rating)}
                        </span>
                        <span className="text-gray-600">
                          {provider.google_rating}
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {provider.google_reviews_count} reviews
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      📍 {provider.location}
                    </div>
                    
                    <div className="flex gap-2">
                      {provider.phone && (
                        <a 
                          href={`tel:${provider.phone}`}
                          className="btn btn-outline btn-sm flex-1"
                        >
                          📞 Call
                        </a>
                      )}
                      {provider.website && (
                        <a 
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm flex-1"
                        >
                          🌐 Visit
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <Link to="/providers" className="btn btn-outline">
                View All Service Providers
              </Link>
            </div>
          </div>
        )}

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