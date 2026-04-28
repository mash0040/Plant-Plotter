// hooks/useAuth.js
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch fresh user profile from API
  const fetchUserProfile = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return null;
      }

      // Check if getProfile method exists
      if (!apiClient.getProfile) {
        throw new Error('getProfile method not found in apiClient');
      }
      
      const userData = await apiClient.getProfile();
      
      if (!userData) {
        return null;
      }
      
      // Ensure user object has proper display fields
      const userWithDisplayName = {
        ...userData,
        displayName: userData.username || userData.name || userData.email,
        username: userData.username || userData.name || 'User'
      };
      
      setUser(userWithDisplayName);
      
      // Update localStorage with fresh data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userWithDisplayName));
      }
      
      return userWithDisplayName;
      
    } catch (error) {
      // Handle authentication errors
      if (error.status === 401 || error.message.includes('Authentication failed') || error.message.includes('Unauthorized')) {
        apiClient.logout();
        setUser(null);
      }
      
      return null;
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initialize auth on mount
    const initializeAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token') || localStorage.getItem('authToken');
          
          if (token) {
            await fetchUserProfile();
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (typeof window !== 'undefined') {
          apiClient.logout();
        }
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const handleAuthExpired = (event) => {
      setUser(null);
      setError(event.detail?.message || 'Your session expired. Please sign in again.');
      setLoading(false);
      router.push('/login');
    };

    window.addEventListener('plantplotter:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('plantplotter:auth-expired', handleAuthExpired);
  }, [router]);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiClient.login(email, password);
      
      // After successful login, fetch fresh profile data
      const freshUser = await fetchUserProfile(true);
      
      if (!freshUser) {
        // Fallback to response data if profile fetch fails
        const userWithDisplayName = {
          ...response.user,
          displayName: response.user.username || response.user.name || response.user.email,
          username: response.user.username || response.user.name || 'User'
        };
        setUser(userWithDisplayName);
      }
      
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
      
      // After successful registration, fetch fresh profile data
      const freshUser = await fetchUserProfile(true);
      
      if (!freshUser) {
        // Fallback to response data
        const userWithDisplayName = {
          ...response.user,
          displayName: response.user.username || response.user.name || name,
          username: response.user.username || response.user.name || name
        };
        setUser(userWithDisplayName);
      }
      
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
      
      // Fetch fresh data after update to ensure sync
      await fetchUserProfile(true);
      
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
      
      // Fetch fresh data after update to ensure sync
      await fetchUserProfile(true);
      
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
    isAuthenticated: !!user,
    refreshProfile: fetchUserProfile
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
