import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManageRequests = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState(null);
  const [bidsForRequest, setBidsForRequest] = useState({});
  const [showBidsModal, setShowBidsModal] = useState(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBidsForRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/service-requests/${requestId}/bids`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBidsForRequest(prev => ({ ...prev, [requestId]: response.data }));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch bids:', error);
      return [];
    }
  };

  const handleEditRequest = (request) => {
    setEditingRequest({
      ...request,
      deadline: request.deadline ? new Date(request.deadline).toISOString().slice(0, 16) : ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        title: editingRequest.title,
        description: editingRequest.description,
        category: editingRequest.category,
        budget_min: parseFloat(editingRequest.budget_min) || null,
        budget_max: parseFloat(editingRequest.budget_max) || null,
        deadline: editingRequest.deadline || null,
        location: editingRequest.location,
        show_best_bids: editingRequest.show_best_bids
      };

      await axios.put(`${API}/service-requests/${editingRequest.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Request updated successfully!');
      setEditingRequest(null);
      fetchMyRequests();
    } catch (error) {
      console.error('Failed to update request:', error);
      alert('Failed to update request. Please try again.');
    }
  };

  const handleViewBids = async (requestId) => {
    setShowBidsModal(requestId);
    if (!bidsForRequest[requestId]) {
      await fetchBidsForRequest(requestId);
    }
  };

  const handleAcceptBid = async (requestId, bidId) => {
    if (!window.confirm('Are you sure you want to accept this bid? This will reject all other bids.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/service-requests/${requestId}/accept-bid/${bidId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Bid accepted successfully!');
      fetchMyRequests();
      fetchBidsForRequest(requestId);
    } catch (error) {
      console.error('Failed to accept bid:', error);
      alert('Failed to accept bid. Please try again.');
    }
  };

  const handleDeclineBid = async (requestId, bidId) => {
    if (!window.confirm('Are you sure you want to decline this bid?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/service-requests/${requestId}/decline-bid/${bidId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Bid declined successfully!');
      fetchBidsForRequest(requestId);
    } catch (error) {
      console.error('Failed to decline bid:', error);
      alert('Failed to decline bid. Please try again.');
    }
  };

  const handleContactBidder = async (bidId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/contact-bidder/${bidId}`, 
        { message: '' }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const { bidder_email, suggested_subject, suggested_message } = response.data;
      
      if (bidder_email) {
        const mailtoLink = `mailto:${bidder_email}?subject=${encodeURIComponent(suggested_subject)}&body=${encodeURIComponent(suggested_message)}`;
        window.location.href = mailtoLink;
      } else {
        alert('Contact information not available for this bidder.');
      }
    } catch (error) {
      console.error('Failed to get contact info:', error);
      alert('Failed to get contact information.');
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

  const getStatusBadge = (status) => {
    const statusClasses = {
      open: 'badge-success',
      in_progress: 'badge-warning',
      completed: 'badge-info',
      cancelled: 'badge-error'
    };
    return `badge ${statusClasses[status]}`;
  };

  const getBidStatusBadge = (status) => {
    const statusClasses = {
      pending: 'badge-warning',
      accepted: 'badge-success',
      declined: 'badge-error',
      rejected: 'badge-error'
    };
    return `badge ${statusClasses[status]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your requests...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Manage My Requests</h1>
            <p className="text-gray-600 mt-1">Edit your requests and manage bids</p>
          </div>
          <Link to="/request-service" className="btn btn-primary">
            + Post New Request
          </Link>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-600 mb-6">Post your first request to get started</p>
            <Link to="/request-service" className="btn btn-primary">
              Post Your First Request
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {myRequests.map((request) => (
              <div key={request.id} className="card">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-gray-600 mt-1">{request.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={getStatusBadge(request.status)}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Posted {formatDate(request.created_at)}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{request.description}</p>

                  <div className="grid grid-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <strong>Budget:</strong> {formatBudget(request.budget_min, request.budget_max)}
                    </div>
                    <div>
                      <strong>Location:</strong> {request.location || 'Not specified'}
                    </div>
                    <div>
                      <strong>Bids:</strong> {request.bid_count || 0}
                    </div>
                  </div>

                  {request.deadline && (
                    <div className="text-sm text-gray-600 mb-4">
                      <strong>Deadline:</strong> {formatDate(request.deadline)}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex gap-3">
                      {request.status === 'open' && (
                        <button
                          onClick={() => handleEditRequest(request)}
                          className="btn btn-secondary btn-sm"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      
                      {request.bid_count > 0 && (
                        <button
                          onClick={() => handleViewBids(request.id)}
                          className="btn btn-primary btn-sm"
                        >
                          👥 View Bids ({request.bid_count})
                        </button>
                      )}
                    </div>

                    <Link 
                      to={`/services/${request.id}`} 
                      className="btn btn-outline btn-sm"
                    >
                      🔍 View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingRequest && (
          <div className="modal-overlay" onClick={() => setEditingRequest(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-xl font-semibold">Edit Request</h2>
                <button onClick={() => setEditingRequest(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingRequest.title}
                    onChange={(e) => setEditingRequest({...editingRequest, title: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={editingRequest.description}
                    onChange={(e) => setEditingRequest({...editingRequest, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Budget Min ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingRequest.budget_min || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, budget_min: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Budget Max ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingRequest.budget_max || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, budget_max: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingRequest.location || ''}
                    onChange={(e) => setEditingRequest({...editingRequest, location: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editingRequest.deadline || ''}
                    onChange={(e) => setEditingRequest({...editingRequest, deadline: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingRequest.show_best_bids || false}
                      onChange={(e) => setEditingRequest({...editingRequest, show_best_bids: e.target.checked})}
                    />
                    <span className="text-sm">Make best bids visible to other bidders</span>
                  </label>
                </div>
              </div>
              
              <div className="modal-footer">
                <button onClick={() => setEditingRequest(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bids Modal */}
        {showBidsModal && (
          <div className="modal-overlay" onClick={() => setShowBidsModal(null)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-xl font-semibold">Manage Bids</h2>
                <button onClick={() => setShowBidsModal(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                {bidsForRequest[showBidsModal]?.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">No bids received yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(bidsForRequest[showBidsModal] || []).map((bid) => (
                      <div key={bid.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{bid.provider_name}</h4>
                            <div className="text-sm text-gray-600">
                              Bid: <span className="font-semibold text-green-600">${bid.price}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={getBidStatusBadge(bid.status)}>
                              {bid.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(bid.created_at)}
                            </span>
                          </div>
                        </div>

                        {bid.proposal && (
                          <div className="mb-3">
                            <strong className="text-sm">Proposal:</strong>
                            <p className="text-sm text-gray-700 mt-1">{bid.proposal}</p>
                          </div>
                        )}

                        {bid.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptBid(showBidsModal, bid.id)}
                              className="btn btn-success btn-sm"
                            >
                              ✅ Accept Bid
                            </button>
                            <button
                              onClick={() => handleDeclineBid(showBidsModal, bid.id)}
                              className="btn btn-error btn-sm"
                            >
                              ❌ Decline
                            </button>
                            <button
                              onClick={() => handleContactBidder(bid.id)}
                              className="btn btn-outline btn-sm"
                            >
                              📧 Contact
                            </button>
                          </div>
                        )}

                        {bid.status === 'accepted' && (
                          <button
                            onClick={() => handleContactBidder(bid.id)}
                            className="btn btn-primary btn-sm"
                          >
                            📧 Contact Provider
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRequests;