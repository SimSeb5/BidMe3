import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';

const RoleManager = () => {
  const { user, addRole } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const userRoles = user?.roles || [user?.role];
  const isCustomer = userRoles.includes('customer');
  const isProvider = userRoles.includes('provider');

  const handleAddRole = async (role) => {
    setLoading(true);
    setMessage('');

    const result = await addRole(role);
    if (result.success) {
      setMessage(`Successfully added ${role} role!`);
    } else {
      setMessage(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="card-header">
              <h1 className="text-2xl font-bold text-gray-900">Manage Your Roles</h1>
              <p className="text-gray-600 mt-1">
                Add roles to access different features on ServiceConnect
              </p>
            </div>
            
            <div className="card-body">
              {message && (
                <div className={`p-4 rounded-lg mb-6 ${
                  message.includes('Successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              {/* Current Roles */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Current Roles</h3>
                <div className="flex gap-3">
                  {userRoles.map((role) => (
                    <span 
                      key={role}
                      className={`badge ${role === 'provider' ? 'badge-in-progress' : 'badge-open'} text-sm px-3 py-1`}
                    >
                      {role === 'provider' ? '💼 Service Provider' : '👤 Customer'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Available Roles */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Role</h3>
                
                {!isCustomer && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">👤</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Customer Role
                        </h4>
                        <p className="text-gray-600 mb-4">
                          Post service requests, receive bids from providers, and manage your projects
                        </p>
                        <button
                          onClick={() => handleAddRole('customer')}
                          disabled={loading}
                          className="btn btn-primary"
                        >
                          {loading ? 'Adding...' : 'Add Customer Role'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!isProvider && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">💼</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Service Provider Role
                        </h4>
                        <p className="text-gray-600 mb-4">
                          Browse service requests, submit bids, create professional profile, and grow your business
                        </p>
                        <button
                          onClick={() => handleAddRole('provider')}
                          disabled={loading}
                          className="btn btn-primary"
                        >
                          {loading ? 'Adding...' : 'Add Provider Role'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isCustomer && isProvider && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      You have all available roles!
                    </h3>
                    <p className="text-gray-600">
                      You can both post service requests and bid on projects from other users.
                    </p>
                  </div>
                )}
              </div>

              {/* Role Benefits */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Benefits</h3>
                <div className="grid grid-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">👤 As a Customer</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Post unlimited service requests</li>
                      <li>• Receive competitive bids</li>
                      <li>• Choose from verified professionals</li>
                      <li>• Manage all your projects</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">💼 As a Provider</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Browse available projects</li>
                      <li>• Submit competitive proposals</li>
                      <li>• Build your professional profile</li>
                      <li>• Get verified and build trust</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManager;