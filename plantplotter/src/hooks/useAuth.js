// hooks/useAuth.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for stored user on mount
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          
          // Ensure we have both username and email for display
          const userWithDisplayName = {
            ...parsedUser,
            displayName: parsedUser.username || parsedUser.name || parsedUser.email,
            username: parsedUser.username || parsedUser.name || 'User'
          };
          
          setUser(userWithDisplayName);
          console.log('👤 Loaded stored user:', userWithDisplayName);
        }
      }
    } catch (err) {
      console.error('Error loading stored user:', err);
      // Clear invalid stored data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.login(email, password);
      
      // Ensure user object has proper display fields
      const userWithDisplayName = {
        ...response.user,
        displayName: response.user.username || response.user.name || response.user.email,
        username: response.user.username || response.user.name || 'User'
      };
      
      setUser(userWithDisplayName);
      console.log('✅ Login successful for user:', userWithDisplayName);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.register(name, email, password);
      
      // Ensure user object has proper display fields
      const userWithDisplayName = {
        ...response.user,
        displayName: response.user.username || response.user.name || name,
        username: response.user.username || response.user.name || name
      };
      
      setUser(userWithDisplayName);
      console.log('✅ Registration successful for user:', userWithDisplayName);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await apiClient.updateProfile(profileData);
      
      // Update user state with new data
      const updatedUser = {
        ...user,
        ...response.user,
        displayName: response.user.username || response.user.name || response.user.email,
        username: response.user.username || response.user.name || 'User'
      };
      
      setUser(updatedUser);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      console.log('✅ Profile updated successfully:', updatedUser);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      setError(null);
      const response = await apiClient.updatePreferences(preferences);
      
      // Update user state with new preferences
      const updatedUser = {
        ...user,
        preferences: preferences
      };
      
      setUser(updatedUser);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      console.log('✅ Preferences updated successfully:', preferences);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = () => {
    try {
      apiClient.logout();
      setUser(null);
      setError(null);
      console.log('👋 User logged out');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    login,
    register,
    updateProfile,
    updatePreferences,
    logout,
    loading,
    error,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};