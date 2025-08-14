import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const ServiceRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || 'open',
    location: searchParams.get('location') || '',
    budget_min: searchParams.get('budget_min') || '',
    budget_max: searchParams.get('budget_max') || '',
    urgency: searchParams.get('urgency') || '',
    search: searchParams.get('search') || '',
    has_images: searchParams.get('has_images') === 'true',
    show_best_bids_only: searchParams.get('show_best_bids_only') === 'true',
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc',
    limit: 100  // Increased from 20 to 100 for better display of hundreds
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Memoize categories to avoid re-fetching
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  // Debounced fetch function for better performance
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add all non-empty filters to params
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== '' && value !== false && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`${API}/service-requests?${params.toString()}`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch categories only once on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Debounce API calls to avoid too many requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRequests();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [fetchRequests]);

  const handleFilterChange = useCallback((name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.keys(newFilters).forEach(key => {
      const filterValue = newFilters[key];
      if (filterValue !== '' && filterValue !== false && filterValue !== null && filterValue !== undefined && key !== 'limit') {
        newSearchParams.set(key, filterValue);
      }
    });
    setSearchParams(newSearchParams);
  }, [filters, setSearchParams]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      category: '',
      status: 'open',
      location: '',
      budget_min: '',
      budget_max: '',
      urgency: '',
      search: '',
      has_images: false,
      show_best_bids_only: false,
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: 20
    };
    setFilters(clearedFilters);
    setSearchParams(new URLSearchParams({ status: 'open' }));
  }, [setSearchParams]);

  // Memoized helper functions
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatBudget = useCallback((min, max) => {
    if (!min && !max) return 'Budget not specified';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
  }, []);

  const getUrgencyBadge = useCallback((urgencyLevel) => {
    switch (urgencyLevel) {
      case 'urgent':
        return <span className="badge badge-error">🔥 Urgent</span>;
      case 'moderate':
        return <span className="badge badge-warning">⚡ Moderate</span>;
      case 'flexible':
        return <span className="badge badge-success">🕒 Flexible</span>;
      default:
        return <span className="badge badge-success">🕒 Flexible</span>;
    }
  }, []);

  // Memoize the request grid to avoid re-rendering
  const requestGrid = useMemo(() => (
    requests.map((request) => (
      <div key={request.id} className="card hover-lift">
        <div className="card-body">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-xl text-gray-900">{request.title}</h3>
            <div className="flex items-center gap-2">
              {getUrgencyBadge(request.urgency_level)}
              <span className={`badge badge-${request.status}`}>
                {request.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4 line-clamp-3">{request.description}</p>
          
          <div className="grid grid-2 gap-4 text-sm text-gray-600 mb-4">
            <div>
              <strong>Category:</strong> {request.category}
            </div>
            <div>
              <strong>Posted by:</strong> {request.user_name}
            </div>
            <div>
              <strong>Budget:</strong> {formatBudget(request.budget_min, request.budget_max)}
            </div>
            <div>
              <strong>Posted:</strong> {formatDate(request.created_at)}
            </div>
          </div>
          
          {request.location && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>📍 Location:</strong> {request.location}
            </div>
          )}
          
          {request.deadline && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>⏰ Deadline:</strong> {formatDate(request.deadline)}
            </div>
          )}

          {request.image_count > 0 && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>📷 Images:</strong> {request.image_count}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-blue-600 font-medium">
                {request.bid_count} bid{request.bid_count !== 1 ? 's' : ''}
              </span>
              
              {request.avg_bid_price && (
                <span className="text-green-600 font-medium">
                  Avg: ${request.avg_bid_price}
                </span>
              )}
              
              {request.show_best_bids && (
                <span className="badge badge-in-progress">
                  Public Bids
                </span>
              )}
            </div>
            
            <Link 
              to={`/services/${request.id}`} 
              className="btn btn-primary"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    ))
  ), [requests, getUrgencyBadge, formatBudget, formatDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
            <p className="text-gray-600 mt-1">Browse and bid on available service opportunities</p>
          </div>
          <Link to="/request-service" className="btn btn-primary">
            Post New Request
          </Link>
        </div>

        {/* Enhanced Filters */}
        <div className="card mb-8">
          <div className="card-body">
            {/* Basic Filters Row */}
            <div className="grid grid-4 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search in titles and descriptions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
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
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="City, State or Zip Code"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>
            </div>

            {/* Toggle Advanced Filters */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="btn btn-outline btn-sm"
              >
                {showAdvancedFilters ? '🔼 Hide' : '🔽 Show'} Advanced Filters
              </button>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Found {requests.length} request{requests.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4">
                <div className="grid grid-4 gap-4 mb-4">
                  <div className="form-group">
                    <label className="form-label">Min Budget ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      value={filters.budget_min}
                      onChange={(e) => handleFilterChange('budget_min', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Budget ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="No limit"
                      value={filters.budget_max}
                      onChange={(e) => handleFilterChange('budget_max', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Urgency</label>
                    <select
                      className="form-select"
                      value={filters.urgency}
                      onChange={(e) => handleFilterChange('urgency', e.target.value)}
                    >
                      <option value="">All Urgency Levels</option>
                      <option value="urgent">🔥 Urgent (within 7 days)</option>
                      <option value="flexible">🕒 Flexible (30+ days)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sort By</label>
                    <select
                      className="form-select"
                      value={`${filters.sort_by}_${filters.sort_order}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('_');
                        handleFilterChange('sort_by', sortBy);
                        handleFilterChange('sort_order', sortOrder);
                      }}
                    >
                      <option value="created_at_desc">Newest First</option>
                      <option value="created_at_asc">Oldest First</option>
                      <option value="budget_max_desc">Highest Budget</option>
                      <option value="budget_min_asc">Lowest Budget</option>
                      <option value="deadline_asc">Deadline Soon</option>
                      <option value="title_asc">Title A-Z</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox Filters */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.has_images}
                      onChange={(e) => handleFilterChange('has_images', e.target.checked)}
                    />
                    <span className="text-sm">📷 Has Images</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.show_best_bids_only}
                      onChange={(e) => handleFilterChange('show_best_bids_only', e.target.checked)}
                    />
                    <span className="text-sm">👁️ Public Bids Only</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <button
                onClick={clearAllFilters}
                className="btn btn-secondary"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading service requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or check back later</p>
            <Link to="/request-service" className="btn btn-primary">
              Post the First Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-2 gap-6">
            {requestGrid}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequestList;