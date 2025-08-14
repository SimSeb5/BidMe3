import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyRequests = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.roles?.includes('customer') || user?.role === 'customer') {
      fetchMyRequests();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get(`${API}/my-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
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

  if (!(user?.roles?.includes('customer') || user?.role === 'customer')) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only customers can view service requests</p>
          <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Service Requests</h1>
            <p className="text-gray-600 mt-1">Manage your posted service requests and bids</p>
          </div>
          <Link to="/request-service" className="btn btn-primary">
            Post New Request
          </Link>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-600 mb-6">Start by posting your first service request</p>
            <Link to="/request-service" className="btn btn-primary">
              Post Service Request
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
                      <strong>Budget:</strong> {formatBudget(request.budget_min, request.budget_max)}
                    </div>
                    <div>
                      <strong>Posted:</strong> {formatDate(request.created_at)}
                    </div>
                    <div>
                      <strong>Bids Received:</strong> {request.bid_count}
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
                    
                    <div className="flex gap-2">
                      <Link 
                        to={`/services/${request.id}`} 
                        className="btn btn-primary"
                      >
                        View Details
                      </Link>
                    </div>
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

export default MyRequests;