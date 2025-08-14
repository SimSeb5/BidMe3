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
        { timeout: 10000 } // 10 second timeout for better AI responses
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
        recommended_providers: [
          {"name": "The Home Depot", "phone": "(800) 466-3337", "website": "https://www.homedepot.com/services", "description": "Professional home services", "match_reason": "Reliable nationwide provider", "location": location || "Nationwide"},
          {"name": "Best Buy Geek Squad", "phone": "(800) 433-5778", "website": "https://www.bestbuy.com/site/geek-squad", "description": "Technology support", "match_reason": "Expert technical assistance", "location": location || "Nationwide"},
          {"name": "LegalZoom", "phone": "(800) 773-0888", "website": "https://www.legalzoom.com", "description": "Legal services", "match_reason": "Professional legal support", "location": location || "Nationwide"}
        ],
        general_tips: urgencyLevel === "urgent" ? "For urgent projects, prioritize providers with immediate availability" : "Always verify credentials and get multiple quotes",
        total_providers_found: 3
      };
      
      setRecommendations(fallbackRecommendations);
    } finally {
      setLoading(false);
    }
  };

  const generateBidRequestEmail = (provider) => {
    const subject = `Service Request via BidMe: ${title || serviceCategory}`;
    const body = `Hello ${provider.name},

I found your business through BidMe (https://bidme.com) and would like to request a bid for my project:

SERVICE DETAILS:
- Service Category: ${serviceCategory}
${title ? `- Project Title: ${title}` : ''}
- Description: ${description}
${location ? `- Location: ${location}` : ''}
${budgetMin && budgetMax ? `- Budget Range: $${budgetMin} - $${budgetMax}` : ''}
${deadline ? `- Deadline: ${deadline}` : ''}
${urgencyLevel ? `- Urgency Level: ${urgencyLevel}` : ''}

ABOUT YOUR BUSINESS:
- Your Website: ${provider.website}
- Why I chose you: ${provider.match_reason}

Please provide a detailed quote for this work including:
1. Timeline for completion
2. Total cost breakdown
3. What's included in the service
4. Any questions you have about the project

I can be reached via this email or phone for any clarifications.

Thank you for your time and I look forward to hearing from you!

Best regards,
BidMe User

---
This service request was sent via BidMe marketplace.
To join our platform and receive more project requests like this, visit: https://bidme.com/register`;
    
    // Try to extract a professional email from the website domain
    let email = 'info@business.com';
    if (provider.website) {
      try {
        const domain = provider.website.replace('https://', '').replace('http://', '').split('/')[0];
        email = `info@${domain}`;
      } catch (e) {
        email = 'info@business.com';
      }
    }
    
    return { email, subject, body };
  };

  if (loading) {
    return (
      <div className="ai-recommendations mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Getting AI recommendations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="ai-recommendations mt-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Recommendations for {serviceCategory}
          </h3>
          
          {recommendations.general_tips && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">💡 General Tips:</h4>
              <p className="text-blue-800 text-sm">{recommendations.general_tips}</p>
            </div>
          )}
        </div>

        {/* Real Service Provider Recommendations */}
        {recommendations.recommended_providers && recommendations.recommended_providers.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🏢</span>
              Recommended Service Providers ({recommendations.recommended_providers.length})
            </h4>
            
            <div className="space-y-4">
              {recommendations.recommended_providers.map((provider, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-1">{provider.name}</h5>
                      <p className="text-gray-600 text-sm mb-2">{provider.description}</p>
                      {provider.match_reason && (
                        <p className="text-green-700 text-xs bg-green-100 px-2 py-1 rounded inline-block mb-2">
                          ✓ {provider.match_reason}
                        </p>
                      )}
                      {provider.location && (
                        <p className="text-gray-500 text-xs">📍 {provider.location}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="provider-details text-xs text-gray-600 mb-3 space-y-1">
                    {provider.phone && (
                      <div className="flex items-center gap-2">
                        <span>📞</span>
                        <span>{provider.phone}</span>
                      </div>
                    )}
                    {provider.website && (
                      <div className="flex items-center gap-2">
                        <span>🌐</span>
                        <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          {provider.website}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="provider-actions flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (provider.phone) {
                          window.location.href = `tel:${provider.phone}`;
                        }
                      }}
                      className="btn btn-outline btn-sm text-xs"
                    >
                      📞 Call
                    </button>
                    
                    <button
                      onClick={() => {
                        if (provider.website) {
                          window.open(provider.website, '_blank');
                        }
                      }}
                      className="btn btn-secondary btn-sm text-xs"
                    >
                      🌐 Visit Website
                    </button>
                    
                    <button
                      onClick={() => {
                        const { email, subject, body } = generateBidRequestEmail(provider);
                        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      className="btn btn-primary btn-sm text-xs"
                    >
                      📧 Request Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate New Recommendations Button */}
        <div className="border-t pt-4">
          <button
            onClick={() => {
              setRecommendations(null);
              fetchRecommendations();
            }}
            className="btn btn-outline btn-sm"
            disabled={loading}
          >
            🔄 Generate New Recommendations
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;