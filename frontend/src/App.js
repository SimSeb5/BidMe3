import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ServiceRequestForm from './components/ServiceRequestForm';
import ServiceRequestList from './components/ServiceRequestList';
import ServiceRequestDetail from './components/ServiceRequestDetail';
import MyRequests from './components/MyRequests';
import ManageRequests from './components/ManageRequests';
import MyBids from './components/MyBids';
import ProviderProfile from './components/ProviderProfile';
import Navigation from './components/Navigation';
import PublicNavigation from './components/PublicNavigation';
import PublicHome from './components/PublicHome';
import RoleManager from './components/RoleManager';
import ServiceProvidersDirectory from './components/ServiceProvidersDirectory';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

// Auth Context
export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(newUser);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const addRole = async (role) => {
    try {
      const response = await axios.post(`${API}/user/add-role`, { role });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to add role' 
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, addRole }}>
      <div className="App">
        <BrowserRouter>
          {/* Show different navigation based on auth status */}
          {user ? <Navigation /> : <PublicNavigation />}
          
          <Routes>
            {/* Public routes - accessible without login */}
            <Route path="/" element={user ? <Dashboard /> : <PublicHome />} />
            <Route path="/services" element={<ServiceRequestList />} />
            <Route path="/services/:id" element={<ServiceRequestDetail />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
            
            {/* Protected routes - require login */}
            {user ? (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/request-service" element={<ServiceRequestForm />} />
                <Route path="/my-requests" element={<MyRequests />} />
                <Route path="/manage-requests" element={<ManageRequests />} />
                <Route path="/my-bids" element={<MyBids />} />
                <Route path="/profile" element={<ProviderProfile />} />
                <Route path="/manage-roles" element={<RoleManager />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<Navigate to="/login" replace />} />
                <Route path="/request-service" element={<Navigate to="/login" replace />} />
                <Route path="/my-requests" element={<Navigate to="/login" replace />} />
                <Route path="/manage-requests" element={<Navigate to="/login" replace />} />
                <Route path="/my-bids" element={<Navigate to="/login" replace />} />
                <Route path="/profile" element={<Navigate to="/login" replace />} />
                <Route path="/manage-roles" element={<Navigate to="/login" replace />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;