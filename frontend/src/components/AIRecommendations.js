import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const AIRecommendations = ({ 
  serviceCategory, 
  description, 
  location, 
  title, 
  budgetMin, 
  budgetMax, 
  deadline, 
  urgencyLevel,
  onRecommendationsReceived 
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceCategory && description) {
      const timeoutId = setTimeout(() => {
        fetchRecommendations();
      }, 1000); // 1 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [serviceCategory, description, location, title, budgetMin, budgetMax, deadline, urgencyLevel]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      const requestData = {
        service_category: serviceCategory,
        description: description,
      };

      // Add optional fields if they exist
      if (location) requestData.location = location;
      if (title) requestData.title = title;
      if (budgetMin) requestData.budget_min = parseFloat(budgetMin);
      if (budgetMax) requestData.budget_max = parseFloat(budgetMax);
      if (deadline) requestData.deadline = deadline;
      if (urgencyLevel) requestData.urgency_level = urgencyLevel;

      const response = await axios.post(
        `${API}/ai-recommendations`,
        requestData,
        { timeout: 8000 } // 8 second timeout for better AI responses
      );

      setRecommendations(response.data);
      if (onRecommendationsReceived) {
        onRecommendationsReceived(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
      
      // Provide enhanced fallback based on available data
      const budgetGuidance = budgetMin && budgetMax 
        ? `Expect quotes within $${parseFloat(budgetMin).toLocaleString()} - $${parseFloat(budgetMax).toLocaleString()}`
        : budgetMin 
          ? `Expect quotes starting from $${parseFloat(budgetMin).toLocaleString()}`
          : "Get multiple quotes for comparison";

      const fallbackRecommendations = {
        ai_insights: {
          qualifications: ["Licensed and insured", "Good reviews", "Relevant experience"],
          questions: ["Are you licensed?", "Can you provide references?", "What's your timeline?"],
          red_flags: ["No license", "Very low prices", "Pressure for payment"],
          price_range: budgetGuidance,
          timeline: urgencyLevel === "urgent" ? "Prioritize immediate availability" : "Ask about timeline upfront"
        },
        recommended_providers: [],
        total_providers_found: 0
      };
      
      setRecommendations(fallbackRecommendations);
      // Remove the error message to avoid showing fallback notice
      // setError('Using general tips (AI temporarily slow)');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-recommendations-loading">
        <div className="spinner"></div>
        <p>🤖 Getting recommendations...</p>
        <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="ai-recommendations-prompt">
        <span className="text-2xl">🤖</span>
        <p className="text-sm text-gray-600 mt-2">
          Fill in category and description for AI tips!
        </p>
      </div>
    );
  }

  const { ai_insights, recommended_providers, total_providers_found } = recommendations;

  return (
    <div className="ai-recommendations">
      {error && (
        <div className="ai-fallback-notice mb-3">
          <p className="text-sm text-orange-600">ℹ️ {error}</p>
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
                <h4 className="font-semibold text-blue-700 mb-2">❓ Ask Providers</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {ai_insights.questions.map((question, index) => (
                    <li key={index}>• {question}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="insight-card">
              <h4 className="font-semibold text-purple-700 mb-2">💰 Budget & Time</h4>
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
            📍 Recommended Providers ({total_providers_found})
          </h3>
          
          <div className="providers-grid">
            {recommended_providers.map((provider) => (
              <div key={provider.id} className="provider-card">
                <div className="provider-header">
                  <h4 className="font-semibold text-lg text-gray-900">{provider.business_name}</h4>
                  <div className="provider-rating">
                    <span className="rating-stars">⭐ {provider.google_rating}</span>
                    <span className="rating-count">({provider.google_reviews_count})</span>
                    {provider.verified && (
                      <span className="verified-badge">✓ Verified</span>
                    )}
                  </div>
                </div>
                
                <p className="provider-description text-sm mb-3">{provider.description}</p>
                
                <div className="provider-details text-xs text-gray-600 mb-3">
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
                </div>
                
                <div className="provider-actions">
                  <button
                    onClick={() => {
                      if (provider.email) {
                        const subject = `Service Request: ${serviceCategory}`;
                        const body = `Hi ${provider.business_name}, I'm interested in your services. Please contact me.`;
                        window.location.href = `mailto:${provider.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      } else if (provider.phone) {
                        alert(`Call ${provider.business_name} at ${provider.phone}`);
                      }
                    }}
                    className="btn btn-primary btn-sm text-xs"
                  >
                    📧 Contact
                  </button>
                  {provider.website && (
                    <button
                      onClick={() => window.open(provider.website, '_blank')}
                      className="btn btn-secondary btn-sm text-xs ml-2"
                    >
                      🌐 Website
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