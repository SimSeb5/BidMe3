import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProviderProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    services_offered: [],
    website_url: ''
  });

  useEffect(() => {
    if (user?.role === 'provider') {
      fetchProfile();
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/provider-profile`);
      setProfile(response.data);
      setFormData({
        business_name: response.data.business_name || '',
        description: response.data.description || '',
        services_offered: response.data.services_offered || [],
        website_url: response.data.website_url || ''
      });
    } catch (error) {
      if (error.response?.status === 404) {
        // Profile doesn't exist yet, user can create one
        setIsEditing(true);
      } else {
        console.error('Failed to fetch profile:', error);
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleServiceToggle = (service) => {
    const updatedServices = formData.services_offered.includes(service)
      ? formData.services_offered.filter(s => s !== service)
      : [...formData.services_offered, service];
    
    setFormData({
      ...formData,
      services_offered: updatedServices
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let response;
      if (profile) {
        // Update existing profile
        response = await axios.put(`${API}/provider-profile`, formData);
      } else {
        // Create new profile
        response = await axios.post(`${API}/provider-profile`, formData);
      }
      
      setProfile(response.data);
      setIsEditing(false);
      setSuccess('Profile saved successfully!');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only service providers can manage profiles</p>
          <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Provider Profile</h1>
              <p className="text-gray-600 mt-1">
                {profile ? 'Manage your professional profile' : 'Create your professional profile'}
              </p>
            </div>
            
            {profile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="card">
            {!isEditing && profile ? (
              // Display Mode
              <div className="card-body">
                <div className="grid grid-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                    
                    {profile.business_name && (
                      <div className="mb-4">
                        <label className="form-label">Business Name</label>
                        <p className="text-gray-700">{profile.business_name}</p>
                      </div>
                    )}
                    
                    {profile.website_url && (
                      <div className="mb-4">
                        <label className="form-label">Website</label>
                        <a 
                          href={profile.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {profile.website_url}
                        </a>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label className="form-label">Verification Status</label>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${profile.is_verified ? 'badge-accepted' : 'badge-pending'}`}>
                          {profile.is_verified ? 'Verified' : 'Pending Verification'}
                        </span>
                        {profile.verification_badge && (
                          <span className="text-sm text-gray-600">
                            • {profile.verification_badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Rating</h3>
                    
                    {profile.services_offered.length > 0 && (
                      <div className="mb-4">
                        <label className="form-label">Services Offered</label>
                        <div className="flex flex-wrap gap-2">
                          {profile.services_offered.map((service) => (
                            <span key={service} className="badge badge-open">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label className="form-label">Rating</label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-yellow-600">
                          {profile.rating || 0}/5
                        </span>
                        <span className="text-sm text-gray-600">
                          ({profile.total_reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {profile.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
                    <p className="text-gray-700 leading-relaxed">{profile.description}</p>
                  </div>
                )}
              </div>
            ) : (
              // Edit Mode
              <div className="card-body">
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      type="text"
                      name="business_name"
                      className="form-input"
                      value={formData.business_name}
                      onChange={handleChange}
                      placeholder="Your business or professional name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Website URL</label>
                    <input
                      type="url"
                      name="website_url"
                      className="form-input"
                      value={formData.website_url}
                      onChange={handleChange}
                      placeholder="https://yourwebsite.com"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Add your business website or portfolio for verification
                    </p>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Services Offered</label>
                    <div className="grid grid-3 gap-2">
                      {categories.map((category) => (
                        <label key={category} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.services_offered.includes(category)}
                            onChange={() => handleServiceToggle(category)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-textarea"
                      value={formData.description}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Describe your business, experience, qualifications, and what makes you unique..."
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
                    </button>
                    
                    {profile && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            business_name: profile.business_name || '',
                            description: profile.description || '',
                            services_offered: profile.services_offered || [],
                            website_url: profile.website_url || ''
                          });
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Verification Info */}
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Verification Process</h3>
              </div>
              <div className="card-body">
                <p className="text-gray-700 mb-4">
                  Get verified to build trust with customers and increase your chances of winning bids.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                    <span>Add your business website or portfolio URL</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                    <span>Upload professional documents (license, insurance, etc.)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                    <span>Wait for our team to review your information</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button className="btn btn-outline" disabled>
                    Upload Documents (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfile;