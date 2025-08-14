import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalRequests: 0,
    myRequests: 0,
    myBids: 0,
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [requestsResponse, myRequestsResponse, myBidsResponse] = await Promise.all([
        axios.get(`${API}/service-requests?status=open`),
        user.role === 'customer' ? axios.get(`${API}/my-requests`) : Promise.resolve({ data: [] }),
        user.role === 'provider' ? axios.get(`${API}/my-bids`) : Promise.resolve({ data: [] })
      ]);

      setStats({
        totalRequests: requestsResponse.data.length,
        myRequests: myRequestsResponse.data.length,
        myBids: myBidsResponse.data.length,
        recentRequests: requestsResponse.data.slice(0, 3)
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="hero" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1739285452621-59d92842fcc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')`
      }}>
        <div className="hero-content">
          <h1>
            {user.role === 'customer' 
              ? 'Find the Perfect Service Provider' 
              : 'Grow Your Business with New Opportunities'
            }
          </h1>
          <p>
            {user.role === 'customer'
              ? 'Post your service needs and get competitive bids from verified professionals'
              : 'Browse service requests and bid on projects that match your expertise'
            }
          </p>
          <div className="flex justify-center gap-4 mt-8">
            {user.role === 'customer' ? (
              <>
                <Link to="/request-service" className="btn btn-primary">
                  Request a Service
                </Link>
                <Link to="/services" className="btn btn-secondary">
                  Browse Requests
                </Link>
              </>
            ) : (
              <>
                <Link to="/services" className="btn btn-primary">
                  Browse Opportunities
                </Link>
                <Link to="/profile" className="btn btn-secondary">
                  Update Profile
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <span className="stat-number">{stats.totalRequests}</span>
            <span className="stat-label">Open Requests</span>
          </div>
          
          {user.role === 'customer' && (
            <div className="stat-card">
              <span className="stat-number">{stats.myRequests}</span>
              <span className="stat-label">My Requests</span>
            </div>
          )}
          
          {user.role === 'provider' && (
            <div className="stat-card">
              <span className="stat-number">{stats.myBids}</span>
              <span className="stat-label">My Bids</span>
            </div>
          )}
          
          <div className="stat-card">
            <span className="stat-number">{categories.length}</span>
            <span className="stat-label">Service Categories</span>
          </div>
        </div>

        {/* Service Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Categories</h2>
          <div className="grid grid-3">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={`/services?category=${encodeURIComponent(category)}`}
                className="card hover-lift text-center"
              >
                <div className="card-body">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{category}</h3>
                  <p className="text-gray-600 text-sm">Browse {category.toLowerCase()} requests</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Requests */}
        {stats.recentRequests.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Service Requests</h2>
              <Link to="/services" className="btn btn-outline">
                View All
              </Link>
            </div>
            
            <div className="grid grid-2">
              {stats.recentRequests.map((request) => (
                <div key={request.id} className="card hover-lift">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
                      <span className={`badge badge-${request.status}`}>
                        {request.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <span>{request.category}</span>
                      <span>{request.bid_count} bids</span>
                    </div>
                    
                    {request.budget_min && request.budget_max && (
                      <div className="text-sm text-gray-600 mb-3">
                        Budget: ${request.budget_min} - ${request.budget_max}
                      </div>
                    )}
                    
                    <Link 
                      to={`/services/${request.id}`} 
                      className="btn btn-primary w-full"
                    >
                      {user.role === 'provider' ? 'View & Bid' : 'View Details'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="flex justify-center gap-4">
            {user.role === 'customer' ? (
              <>
                <Link to="/request-service" className="btn btn-primary">
                  Post New Request
                </Link>
                <Link to="/my-requests" className="btn btn-secondary">
                  Manage My Requests
                </Link>
              </>
            ) : (
              <>
                <Link to="/services" className="btn btn-primary">
                  Find New Projects
                </Link>
                <Link to="/my-bids" className="btn btn-secondary">
                  Track My Bids
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;