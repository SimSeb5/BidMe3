import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyBids = () => {
  const { user } = useContext(AuthContext);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.roles?.includes('provider') || user?.role === 'provider') {
      fetchMyBids();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyBids = async () => {
    try {
      const response = await axios.get(`${API}/my-bids`);
      setBids(response.data);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!(user?.roles?.includes('provider') || user?.role === 'provider')) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only service providers can view bids</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
            <p className="text-gray-600 mt-1">Track your submitted bids and their status</p>
          </div>
          <Link to="/services" className="btn btn-primary">
            Find New Projects
          </Link>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : bids.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bids submitted yet</h3>
            <p className="text-gray-600 mb-6">Start bidding on service requests to grow your business</p>
            <Link to="/services" className="btn btn-primary">
              Browse Service Requests
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bids.map((bid) => (
              <div key={bid.id} className="card hover-lift">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Link 
                        to={`/services/${bid.service_request_id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {bid.service_title}
                      </Link>
                      <p className="text-gray-600 text-sm mt-1">{bid.service_category}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`badge badge-${bid.status}`}>
                        {bid.status}
                      </span>
                      <div className="text-2xl font-bold text-green-600 mt-1">
                        ${bid.price}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Your Proposal:</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{bid.proposal}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Submitted on {formatDate(bid.created_at)}</span>
                    
                    <div className="flex gap-3">
                      <Link 
                        to={`/services/${bid.service_request_id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Request
                      </Link>
                      
                      {bid.status === 'pending' && (
                        <span className="text-amber-600 font-medium">
                          Awaiting Response
                        </span>
                      )}
                      
                      {bid.status === 'accepted' && (
                        <span className="text-green-600 font-medium">
                          🎉 Bid Accepted!
                        </span>
                      )}
                      
                      {bid.status === 'rejected' && (
                        <span className="text-red-600 font-medium">
                          Not Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {bids.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Bidding Statistics</h2>
            <div className="grid grid-3">
              <div className="stat-card">
                <span className="stat-number">{bids.length}</span>
                <span className="stat-label">Total Bids</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-number">
                  {bids.filter(bid => bid.status === 'pending').length}
                </span>
                <span className="stat-label">Pending</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-number">
                  {bids.filter(bid => bid.status === 'accepted').length}
                </span>
                <span className="stat-label">Accepted</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBids;