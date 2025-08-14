import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import ImageUpload from './ImageUpload';
import AIRecommendations from './AIRecommendations';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

const ServiceRequestForm = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget_min: '',
    budget_max: '',
    deadline: '',
    location: '',
    images: [],
    show_best_bids: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [aiCategorySelected, setAiCategorySelected] = useState(false);

  useEffect(() => {
    // Support both old and new role systems
    const userRoles = user?.roles || [user?.role];
    if (!userRoles.includes('customer')) {
      navigate('/');
      return;
    }
    fetchCategories();
    detectLocation();
  }, [user, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use reverse geocoding to get city/state from coordinates
            const { latitude, longitude } = position.coords;
            
            // For demo purposes, we'll use a simple approach
            // In production, you'd use a geocoding service like Google Maps API
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            
            const location = `${data.city}, ${data.principalSubdivision}`;
            setFormData(prev => ({ ...prev, location }));
          } catch (error) {
            console.log('Could not detect location automatically');
          }
          setLocationLoading(false);
        },
        (error) => {
          console.log('Location access denied');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const getAiCategorySelection = async (title, description) => {
    if (!title.trim() || !description.trim()) return;
    
    setCategoryLoading(true);
    try {
      const response = await axios.post(`${API}/ai-category-selection`, {
        title: title.trim(),
        description: description.trim()
      });
      
      if (response.data.selected_category) {
        setFormData(prev => ({ 
          ...prev, 
          category: response.data.selected_category 
        }));
        setAiCategorySelected(true);
        
        // Show AI recommendations since we now have category and description
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error('Failed to get AI category selection:', error);
      // Don't show error to user, just let them select manually
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    setFormData(newFormData);

    // Trigger AI category selection when both title and description are available
    if ((name === 'title' || name === 'description') && !aiCategorySelected) {
      const title = name === 'title' ? value : formData.title;
      const description = name === 'description' ? value : formData.description;
      
      if (title.trim() && description.trim() && title.trim().length > 5 && description.trim().length > 10) {
        // Debounce the AI call
        setTimeout(() => {
          getAiCategorySelection(title, description);
        }, 1000);
      }
    }

    // Show AI recommendations when we have enough info
    if (newFormData.category && newFormData.description) {
      setShowRecommendations(true);
    }

    // If user manually changes category, don't auto-select again
    if (name === 'category' && value !== '') {
      setAiCategorySelected(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = { ...formData };
      
      // Convert budget fields to numbers if provided
      if (submitData.budget_min) {
        submitData.budget_min = parseFloat(submitData.budget_min);
      }
      if (submitData.budget_max) {
        submitData.budget_max = parseFloat(submitData.budget_max);
      }
      
      // Convert deadline to ISO string if provided
      if (submitData.deadline) {
        submitData.deadline = new Date(submitData.deadline).toISOString();
      }
      
      // Remove empty fields except images
      Object.keys(submitData).forEach(key => {
        if (key !== 'images' && (submitData[key] === '' || submitData[key] === null)) {
          delete submitData[key];
        }
      });

      const response = await axios.post(`${API}/service-requests`, submitData);
      navigate(`/services/${response.data.id}`);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="card-header">
              <h1 className="text-2xl font-bold text-gray-900">Request a Service</h1>
              <p className="text-gray-600 mt-1">
                Describe your service needs and get AI-powered recommendations plus competitive bids
              </p>
            </div>
            
            <div className="card-body">
              {error && <div className="error">{error}</div>}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-group">
                  <label className="form-label">Service Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Kitchen Renovation, Plumbing Repair, Logo Design"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Category 
                    {categoryLoading && <span className="text-blue-600 ml-2">🤖 AI selecting...</span>}
                    {aiCategorySelected && !categoryLoading && <span className="text-green-600 ml-2">✓ AI selected</span>}
                  </label>
                  <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    disabled={categoryLoading}
                  >
                    <option value="">
                      {categoryLoading ? "AI is selecting category..." : "Select a category or let AI choose"}
                    </option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-1">
                    Fill in the title and description below, and AI will automatically select the best category
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Location 
                    {locationLoading && <span className="text-blue-600 ml-2">🌍 Detecting...</span>}
                  </label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, State or specific address"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Adding your location helps us recommend nearby service providers
                  </p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Provide detailed information about what you need, any specific requirements, materials, timeline, etc."
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Be detailed - AI will use this information to suggest the best category and providers
                  </p>
                </div>

                {/* AI Recommendations appear here when conditions are met */}
                {showRecommendations && formData.category && formData.description && (
                  <AIRecommendations
                    serviceCategory={formData.category}
                    description={formData.description}
                    location={formData.location}
                    title={formData.title}
                    budgetMin={formData.budget_min}
                    budgetMax={formData.budget_max}
                    deadline={formData.deadline}
                    urgencyLevel={formData.deadline ? 
                      (new Date(formData.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000 ? 'urgent' : 
                       new Date(formData.deadline) - new Date() > 30 * 24 * 60 * 60 * 1000 ? 'flexible' : 'moderate') 
                      : 'flexible'}
                  />
                )}

                {/* Image Upload Section */}
                <div className="form-group">
                  <label className="form-label">Project Images (Optional)</label>
                  <p className="text-sm text-gray-600 mb-3">
                    Add images to help service providers better understand your project requirements
                  </p>
                  <ImageUpload 
                    images={formData.images}
                    setImages={(images) => setFormData({ ...formData, images })}
                    maxImages={5}
                  />
                </div>
                
                <div className="grid grid-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Minimum Budget (Optional)</label>
                    <input
                      type="number"
                      name="budget_min"
                      className="form-input"
                      value={formData.budget_min}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Maximum Budget (Optional)</label>
                    <input
                      type="number"
                      name="budget_max"
                      className="form-input"
                      value={formData.budget_max}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Location 
                    {locationLoading && <span className="text-blue-600 ml-2">🌍 Detecting...</span>}
                  </label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, State or specific address"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Adding your location helps us recommend nearby service providers
                  </p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Deadline (Optional)</label>
                  <input
                    type="date"
                    name="deadline"
                    className="form-input"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="show_best_bids"
                      id="show_best_bids"
                      checked={formData.show_best_bids}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_best_bids" className="form-label mb-0">
                      Show best bids publicly
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Allow other users to see the top 3 lowest bids to encourage competitive pricing
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Creating Request...' : 'Post Service Request'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestForm;