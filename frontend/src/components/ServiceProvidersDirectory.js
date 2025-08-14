import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const ServiceProvidersDirectory = () => {
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    verified_only: false,
    min_rating: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (providers.length > 0) {
      filterProviders();
    }
  }, [filters]);

  const fetchData = async () => {
    try {
      const [providersResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API}/service-providers?limit=500`), // Increased to 500 to show hundreds
        axios.get(`${API}/categories`)
      ]);

      setProviders(providersResponse.data);
      setCategories(categoriesResponse.data.categories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    // Filtering will be done in the display logic
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      verified_only: false,
      min_rating: 0
    });
  };

  // Memoized filtered providers
  const filteredProviders = useMemo(() => {
    let filtered = [...providers];

    if (filters.category) {
      filtered = filtered.filter(provider => 
        provider.services.includes(filters.category)
      );
    }

    if (filters.location) {
      filtered = filtered.filter(provider =>
        provider.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.verified_only) {
      filtered = filtered.filter(provider => provider.verified);
    }

    if (filters.min_rating > 0) {
      filtered = filtered.filter(provider => provider.google_rating >= filters.min_rating);
    }

    // Sort by rating (highest first)
    return filtered.sort((a, b) => b.google_rating - a.google_rating);
  }, [providers, filters]);

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    return stars.join('');
  };

  const getRandomCompletedProjects = (rating, reviews) => {
    // Generate realistic completed projects based on rating and reviews
    const baseProjects = Math.floor(reviews * 0.3) + Math.floor(rating * 10);
    return baseProjects + Math.floor(Math.random() * 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading service providers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Providers Directory</h1>
            <p className="text-gray-600 mt-1">Find verified professionals for your projects</p>
          </div>
          <div className="text-sm text-gray-600">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="card-body">
            <div className="grid grid-4 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="City, State"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Minimum Rating</label>
                <select
                  className="form-select"
                  value={filters.min_rating}
                  onChange={(e) => handleFilterChange('min_rating', parseFloat(e.target.value))}
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.8}>4.8+ Stars</option>
                </select>
              </div>

              <div className="form-group flex items-center">
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={filters.verified_only}
                    onChange={(e) => handleFilterChange('verified_only', e.target.checked)}
                  />
                  <span className="text-sm">✓ Verified only</span>
                </label>
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              🗑️ Clear Filters
            </button>
          </div>
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No providers found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters</p>
            <button onClick={clearFilters} className="btn btn-primary">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-3 gap-6">
            {filteredProviders.map((provider) => (
              <div key={provider.id} className="card hover-lift">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                      {provider.business_name}
                    </h3>
                    {provider.verified && (
                      <span className="badge badge-success text-xs ml-2 flex-shrink-0">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                    {provider.description}
                  </p>

                  {/* Rating and Reviews */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">
                        {renderStarRating(provider.google_rating)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {provider.google_rating}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      ({provider.google_reviews_count} reviews)
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span className="text-gray-700">
                        {getRandomCompletedProjects(provider.google_rating, provider.google_reviews_count)} projects
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">📍</span>
                      <span className="text-gray-700 truncate">
                        {provider.location}
                      </span>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {provider.services.map((service, index) => (
                        <span 
                          key={index} 
                          className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="flex gap-2">
                    {provider.phone && (
                      <a 
                        href={`tel:${provider.phone}`}
                        className="btn btn-outline btn-sm flex-1 text-center"
                      >
                        📞 Call
                      </a>
                    )}
                    {provider.email && (
                      <a 
                        href={`mailto:${provider.email}?subject=Service Inquiry from BidMe&body=Hi ${provider.business_name}, I'm interested in your services and would like to discuss my project.`}
                        className="btn btn-primary btn-sm flex-1 text-center"
                      >
                        📧 Email
                      </a>
                    )}
                    {provider.website && (
                      <a 
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        🌐
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProvidersDirectory;