import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIRecommendations = ({ serviceCategory, description, location, onRecommendationsReceived }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeoutReached, setTimeoutReached] = useState(false);
  const requestTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced fetch function to avoid too many API calls
  const fetchRecommendations = useCallback(async () => {
    if (!serviceCategory || !description) return;

    // Clear any existing timeout
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError('');
    setTimeoutReached(false);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Set timeout to show fallback after 4 seconds
    requestTimeoutRef.current = setTimeout(() => {
      setTimeoutReached(true);
    }, 4000);

    try {
      const response = await axios.post(
        `${API}/ai-recommendations`,
        {
          service_category: serviceCategory,
          description: description,
          location: location
        },
        {
          timeout: 8000, // 8 second timeout
          signal: abortControllerRef.current.signal
        }
      );

      clearTimeout(requestTimeoutRef.current);
      setRecommendations(response.data);
      setTimeoutReached(false);
      
      if (onRecommendationsReceived) {
        onRecommendationsReceived(response.data);
      }
    } catch (error) {
      clearTimeout(requestTimeoutRef.current);
      
      if (error.name === 'CanceledError') {
        // Request was cancelled, don't show error
        return;
      }
      
      console.error('Failed to fetch AI recommendations:', error);
      
      // Provide fallback recommendations instead of showing error
      const fallbackRecommendations = {
        ai_insights: {
          qualifications: ["Licensed and insured", "Good reviews and ratings", "Relevant experience in " + serviceCategory],
          questions: ["Are you licensed and insured?", "Can you provide references?", "What's your estimated timeline?", "Do you offer warranties?"],
          red_flags: ["No license or insurance", "Unusually low prices", "Pressure for immediate payment", "No references available"],
          price_range: "Get multiple quotes for comparison",
          timeline: "Discuss timeline expectations upfront"
        },
        recommended_providers: [],
        total_providers_found: 0
      };
      
      setRecommendations(fallbackRecommendations);
      setError('Using general recommendations (AI service temporarily unavailable)');
    } finally {
      setLoading(false);
      setTimeoutReached(false);
    }
  }, [serviceCategory, description, location, onRecommendationsReceived]);

  // Debounce the API call
  useEffect(() => {
    if (serviceCategory && description) {
      const debounceTimeout = setTimeout(() => {
        fetchRecommendations();
      }, 800); // Wait 800ms after user stops typing

      return () => clearTimeout(debounceTimeout);
    }
  }, [fetchRecommendations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendContactMessage = (provider) => {
    const subject = `Service Request: ${serviceCategory}`;
    const body = `Hi ${provider.business_name},\n\nI'm interested in your services for:\n\n${description}\n\nLocation: ${location || 'Not specified'}\n\nPlease let me know if you're available and can provide a quote.\n\nThank you!`;
    
    if (provider.email) {
      window.location.href = `mailto:${provider.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (provider.phone) {
      alert(`Call ${provider.business_name} at ${provider.phone}`);
    } else if (provider.website) {
      window.open(provider.website, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="ai-recommendations-loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <div className="loading-text">
            <p>🤖 Getting AI-powered recommendations...</p>
            {timeoutReached && (
              <p className="text-sm text-yellow-600 mt-2">
                ⏱️ This is taking longer than usual. Getting general recommendations...
              </p>
            )}
          </div>
        </div>
        <div className="loading-tips">
          <p className="text-xs text-gray-500">
            💡 While you wait, consider adding more details to your description for better recommendations
          </p>
        </div>
      </div>
    );
  }

  if (error && !recommendations) {
    return (
      <div className="ai-recommendations-error">
        <p className="text-orange-600 text-sm mb-2">⚠️ {error}</p>
        <button onClick={fetchRecommendations} className="btn btn-outline btn-sm">
          🔄 Try Again
        </button>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="ai-recommendations-prompt">
        <div className="prompt-content">
          <span className="text-2xl">🤖</span>
          <p className="text-sm text-gray-600 mt-2">
            Fill in the service category and description to get AI-powered recommendations!
          </p>
        </div>
      </div>
    );
  }

  const { ai_insights, recommended_providers, total_providers_found } = recommendations;

  return (
    <div className="ai-recommendations">
      {error && (
        <div className="ai-fallback-notice">
          <p className="text-sm text-orange-600 mb-3">ℹ️ {error}</p>
        </div>
      )}
      
      {/* AI Insights */}
      {ai_insights && (
        <div className="ai-insights-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Recommendations for {serviceCategory}
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
                    📧 Contact Provider
                  </button>
                  {provider.website && (
                    <button
                      onClick={() => window.open(provider.website, '_blank')}
                      className="btn btn-secondary btn-sm"
                    >
                      🌐 View Website
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