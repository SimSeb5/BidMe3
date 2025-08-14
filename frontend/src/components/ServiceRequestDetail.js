import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidForm, setBidForm] = useState({
    price: '',
    proposal: '',
    start_date: '',
    duration_days: '',
    duration_description: ''
  });
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [selectedBid, setSelectedBid] = useState(null);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    fetchRequestDetails();
    fetchBids();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await axios.get(`${API}/service-requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      if (error.response?.status === 404) {
        navigate('/services');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const response = await axios.get(`${API}/service-requests/${id}/bids`);
      setBids(response.data);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
      if (error.response?.status !== 403) {
        setError('Failed to load bids');
      }
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/bids`, {
        service_request_id: id,
        price: parseFloat(bidForm.price),
        proposal: bidForm.proposal
      });

      setBids([response.data, ...bids]);
      setBidForm({ price: '', proposal: '' });
      setShowBidForm(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to submit bid');
    } finally {
      setBidLoading(false);
    }
  };

  const fetchMessages = async (bidId) => {
    try {
      const response = await axios.get(`${API}/bid-messages/${bidId}`);
      setMessages({ ...messages, [bidId]: response.data });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async (bidId) => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`${API}/bid-messages`, {
        bid_id: bidId,
        message: newMessage
      });

      const currentMessages = messages[bidId] || [];
      setMessages({
        ...messages,
        [bidId]: [...currentMessages, response.data]
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const formatBudget = (min, max) => {
    if (!min && !max) return 'Budget not specified';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Request Not Found</h1>
          <button onClick={() => navigate('/services')} className="btn btn-primary">
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === request.user_id;
  const canBid = user?.roles?.includes('provider') && !isOwner && request.status === 'open';
  const userBid = bids.find(bid => bid.provider_id === user?.id);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Request Details */}
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
                  <p className="text-gray-600 mt-1">Posted by {request.user_name}</p>
                </div>
                <span className={`badge badge-${request.status}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <div className="card-body">
              <div className="grid grid-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Service Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Category:</strong> {request.category}</div>
                    <div><strong>Budget:</strong> {formatBudget(request.budget_min, request.budget_max)}</div>
                    {request.location && <div><strong>Location:</strong> {request.location}</div>}
                    {request.deadline && <div><strong>Deadline:</strong> {formatDate(request.deadline)}</div>}
                    <div><strong>Posted:</strong> {formatDate(request.created_at)}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Project Description</h3>
                  <p className="text-gray-700 leading-relaxed">{request.description}</p>
                </div>
              </div>

              {/* Images Section */}
              {request.images && request.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">📷 Project Images ({request.images.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {request.images.map((image, index) => (
                      <div 
                        key={index} 
                        className="image-thumbnail cursor-pointer"
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img 
                          src={image} 
                          alt={`Project image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border hover:border-blue-400 hover:shadow-md transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {canBid && !userBid && (
                <div className="text-center">
                  <button
                    onClick={() => setShowBidForm(true)}
                    className="btn btn-primary"
                  >
                    Submit Bid
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bid Form */}
          {showBidForm && (
            <div className="card mb-8">
              <div className="card-header">
                <h2 className="text-xl font-bold">Submit Your Bid</h2>
              </div>
              
              <div className="card-body">
                {error && <div className="error">{error}</div>}
                
                <form onSubmit={handleBidSubmit} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Your Price ($) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={bidForm.price}
                      onChange={(e) => setBidForm({ ...bidForm, price: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      placeholder="Enter your price"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Proposal *</label>
                    <textarea
                      className="form-textarea"
                      value={bidForm.proposal}
                      onChange={(e) => setBidForm({ ...bidForm, proposal: e.target.value })}
                      required
                      rows={4}
                      placeholder="Explain your approach, timeline, experience, and why you're the best choice..."
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">📅 Timeline Information</h4>
                    <div className="grid grid-3 gap-4">
                      <div className="form-group">
                        <label className="form-label">Available Start Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={bidForm.start_date}
                          onChange={(e) => setBidForm({ ...bidForm, start_date: e.target.value })}
                          placeholder="When can you start?"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Duration (Days)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={bidForm.duration_days}
                          onChange={(e) => setBidForm({ ...bidForm, duration_days: e.target.value })}
                          placeholder="How many days needed?"
                          min="1"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Duration Description</label>
                        <input
                          type="text"
                          className="form-input"
                          value={bidForm.duration_description}
                          onChange={(e) => setBidForm({ ...bidForm, duration_description: e.target.value })}
                          placeholder="e.g., 2-3 weeks"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Providing timeline information helps customers choose the right provider for their schedule.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={bidLoading}
                    >
                      {bidLoading ? 'Submitting...' : 'Submit Bid'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowBidForm(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Bids Section */}
          {bids.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-bold">
                  Bids ({bids.length})
                  {request.show_best_bids && !isOwner && !userBid && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Showing top 3 bids)
                    </span>
                  )}
                </h2>
              </div>
              
              <div className="card-body">
                <div className="space-y-6">
                  {bids.map((bid) => (
                    <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{bid.provider_name}</h4>
                          <p className="text-2xl font-bold text-green-600">${bid.price}</p>
                        </div>
                        <div className="text-right">
                          <span className={`badge badge-${bid.status}`}>
                            {bid.status}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(bid.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{bid.proposal}</p>
                      
                      {(isOwner || bid.provider_id === user?.id) && (
                        <div className="border-t pt-4">
                          <button
                            onClick={() => {
                              if (selectedBid === bid.id) {
                                setSelectedBid(null);
                              } else {
                                setSelectedBid(bid.id);
                                fetchMessages(bid.id);
                              }
                            }}
                            className="btn btn-outline btn-sm"
                          >
                            {selectedBid === bid.id ? 'Hide Messages' : 'View Messages'}
                          </button>
                          
                          {selectedBid === bid.id && (
                            <div className="mt-4 bg-gray-50 rounded-lg p-4">
                              <div className="max-h-60 overflow-y-auto mb-4">
                                {messages[bid.id]?.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`mb-3 p-3 rounded-lg ${
                                      message.sender_id === user?.id
                                        ? 'bg-blue-100 ml-8'
                                        : 'bg-white mr-8'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-medium text-sm">
                                        {message.sender_name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(message.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm">{message.message}</p>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="form-input flex-1"
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  placeholder="Type your message..."
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      sendMessage(bid.id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => sendMessage(bid.id)}
                                  className="btn btn-primary"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {bids.length === 0 && (
            <div className="card">
              <div className="card-body text-center py-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bids yet</h3>
                <p className="text-gray-600">
                  {canBid ? 'Be the first to submit a bid!' : 'Check back later for bids.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && request.images && (
        <div className="modal-overlay" onClick={() => setSelectedImageIndex(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-semibold">
                Project Image {selectedImageIndex + 1} of {request.images.length}
              </h2>
              <button onClick={() => setSelectedImageIndex(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="modal-body text-center">
              <img 
                src={request.images[selectedImageIndex]} 
                alt={`Project image ${selectedImageIndex + 1}`}
                className="max-w-full max-h-96 mx-auto rounded-lg"
              />
              
              <div className="flex justify-center items-center gap-4 mt-4">
                {selectedImageIndex > 0 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    ← Previous
                  </button>
                )}
                
                <span className="text-sm text-gray-600">
                  {selectedImageIndex + 1} / {request.images.length}
                </span>
                
                {selectedImageIndex < request.images.length - 1 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequestDetail;