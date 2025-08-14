import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || 'open'
  });

  useEffect(() => {
    fetchCategories();
    fetchRequests();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`${API}/service-requests?${params.toString()}`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    if (newFilters.category) newSearchParams.set('category', newFilters.category);
    if (newFilters.status) newSearchParams.set('status', newFilters.status);
    setSearchParams(newSearchParams);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBudget = (min, max) => {
    if (!min && !max) return 'Budget not specified';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
  };

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

        {/* Filters */}
        <div className="card mb-8">
          <div className="card-body">
            <div className="grid grid-3 gap-4">
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
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ category: '', status: 'open' });
                    setSearchParams(new URLSearchParams());
                  }}
                  className="btn btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
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
            {requests.map((request) => (
              <div key={request.id} className="card hover-lift">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-xl text-gray-900">{request.title}</h3>
                    <span className={`badge badge-${request.status}`}>
                      {request.status.replace('_', ' ')}
                    </span>
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
                    <div className="text-sm text-gray-600 mb-4">
                      <strong>Location:</strong> {request.location}
                    </div>
                  )}
                  
                  {request.deadline && (
                    <div className="text-sm text-gray-600 mb-4">
                      <strong>Deadline:</strong> {formatDate(request.deadline)}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-blue-600 font-medium">
                        {request.bid_count} bid{request.bid_count !== 1 ? 's' : ''}
                      </span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequestList;