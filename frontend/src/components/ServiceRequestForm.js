import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import ImageUpload from './ImageUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  useEffect(() => {
    // Support both old and new role systems
    const userRoles = user?.roles || [user?.role];
    if (!userRoles.includes('customer')) {
      navigate('/');
      return;
    }
    fetchCategories();
  }, [user, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
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
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="card-header">
              <h1 className="text-2xl font-bold text-gray-900">Request a Service</h1>
              <p className="text-gray-600 mt-1">
                Describe your service needs and get competitive bids from qualified providers
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
                  <label className="form-label">Category *</label>
                  <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
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
                </div>

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
                  <label className="form-label">Location (Optional)</label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, State or specific address if needed"
                  />
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