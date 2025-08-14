import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIRecommendations = ({ serviceCategory, description, location, onRecommendationsReceived }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceCategory && description) {
      fetchRecommendations();
    }
  }, [serviceCategory, description, location]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/ai-recommendations`, {
        service_category: serviceCategory,
        description: description,
        location: location
      });

      setRecommendations(response.data);
      if (onRecommendationsReceived) {
        onRecommendationsReceived(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
      setError('Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const sendContactMessage = async (provider) => {
    // This would integrate with email/messaging system
    const subject = `Service Request: ${serviceCategory}`;
    const body = `Hi ${provider.business_name},\n\nI'm interested in your services for:\n\n${description}\n\nLocation: ${location || 'Not specified'}\n\nPlease let me know if you're available and can provide a quote.\n\nThank you!`;
    
    if (provider.email) {
      // Open email client
      window.location.href = `mailto:${provider.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (provider.phone) {
      // Show phone number
      alert(`Call ${provider.business_name} at ${provider.phone}`);
    } else if (provider.website) {
      // Open website
      window.open(provider.website, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="ai-recommendations-loading">
        <div className="spinner"></div>
        <p>Getting AI-powered recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations-error">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchRecommendations} className="btn btn-outline btn-sm">
          Try Again
        </button>
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  const { ai_insights, recommended_providers, total_providers_found } = recommendations;

  return (
    <div className="ai-recommendations">
      {/* AI Insights */}
      {ai_insights && (
        <div className="ai-insights-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Recommendations
          </h3>
          
          <div className="grid grid-2 gap-4 mb-6">
            {ai_insights.qualifications && (
              <div className="insight-card">
                <h4 className="font-semibold text-green-700 mb-2">✅ Look For</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {ai_insights.qualifications.map((qual, index) => (
                    <li key={index}>• {qual}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {ai_insights.red_flags && (
              <div className="insight-card">
                <h4 className="font-semibold text-red-700 mb-2">🚩 Red Flags</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {ai_insights.red_flags.map((flag, index) => (
                    <li key={index}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {ai_insights.questions && (
              <div className="insight-card">
                <h4 className="font-semibold text-blue-700 mb-2">❓ Questions to Ask</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {ai_insights.questions.map((question, index) => (
                    <li key={index}>• {question}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="insight-card">
              <h4 className="font-semibold text-purple-700 mb-2">💰 Price & Timeline</h4>
              <div className="text-sm text-gray-700 space-y-1">
                {ai_insights.price_range && (
                  <p><strong>Price:</strong> {ai_insights.price_range}</p>
                )}
                {ai_insights.timeline && (
                  <p><strong>Timeline:</strong> {ai_insights.timeline}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Providers */}
      {recommended_providers && recommended_providers.length > 0 && (
        <div className="recommended-providers-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📍 Recommended Providers Near You ({total_providers_found})
          </h3>
          
          <div className="providers-grid">
            {recommended_providers.map((provider) => (
              <div key={provider.id} className="provider-card">
                <div className="provider-header">
                  <h4 className="font-semibold text-lg text-gray-900">{provider.business_name}</h4>
                  <div className="provider-rating">
                    <span className="rating-stars">⭐ {provider.google_rating}</span>
                    <span className="rating-count">({provider.google_reviews_count} reviews)</span>
                    {provider.verified && (
                      <span className="verified-badge">✓ Verified</span>
                    )}
                  </div>
                </div>
                
                <p className="provider-description">{provider.description}</p>
                
                <div className="provider-details">
                  <div className="detail-item">
                    <span className="detail-icon">📍</span>
                    <span>{provider.location}</span>
                  </div>
                  
                  {provider.phone && (
                    <div className="detail-item">
                      <span className="detail-icon">📞</span>
                      <span>{provider.phone}</span>
                    </div>
                  )}
                  
                  {provider.website && (
                    <div className="detail-item">
                      <span className="detail-icon">🌐</span>
                      <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        Visit Website
                      </a>
                    </div>
                  )}
                  
                  {provider.distance_km && (
                    <div className="detail-item">
                      <span className="detail-icon">🚗</span>
                      <span>{provider.distance_km} km away</span>
                    </div>
                  )}
                </div>
                
                <div className="provider-actions">
                  <button
                    onClick={() => sendContactMessage(provider)}
                    className="btn btn-primary btn-sm"
                  >
                    Contact Provider
                  </button>
                  {provider.website && (
                    <button
                      onClick={() => window.open(provider.website, '_blank')}
                      className="btn btn-secondary btn-sm"
                    >
                      View Website
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;