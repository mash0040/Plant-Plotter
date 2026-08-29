// hooks/useAuth.js
'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { getUserFacingErrorMessage, isAuthenticationError } from '@/lib/apiErrors';

const AuthContext = createContext(null);

export const SESSION_EXPIRED_FLAG = 'plantplotter:session-expired';

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tracks whether the user was authenticated during this tab's lifetime.
  // We only show "Your session expired" if a real, established session was lost —
  // not on initial token validation against a stale localStorage value.
  const hadActiveSessionRef = useRef(false);

  // Function to fetch fresh user profile from API
  const fetchUserProfile = useCallback(async (skipLoading = false) => {
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
      if (isAuthenticationError(error)) {
        apiClient.logout();
        setUser(null);
        hadActiveSessionRef.current = false;

        if (typeof window !== 'undefined') {
          if (error.code === 'TOKEN_EXPIRED') {
            try {
              window.sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
            } catch (storageError) {
              // sessionStorage may be unavailable; fall through silently
            }
          }

          if (window.location.pathname !== '/login') {
            router.replace('/login');
          }
        }
      }
      
      return null;
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  }, [router]);

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
  }, [fetchUserProfile]);

  useEffect(() => {
    const handleAuthExpired = () => {
      const wasAuthenticated = hadActiveSessionRef.current;
      hadActiveSessionRef.current = false;
      setUser(null);
      setError(null);
      setLoading(false);

      // Only flag "session expired" if the user actually had a live session.
      // A 401 during initial token validation (stale localStorage on cold load)
      // should NOT surface a session-expired banner.
      if (wasAuthenticated && typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
        } catch (storageError) {
          // sessionStorage may be unavailable; fall through silently
        }
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.replace('/login');
      }
    };

    window.addEventListener('plantplotter:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('plantplotter:auth-expired', handleAuthExpired);
  }, [router]);

  // Mark the session as active once we have a real user.
  useEffect(() => {
    if (user) {
      hadActiveSessionRef.current = true;
    }
  }, [user]);

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
      setError(getUserFacingErrorMessage(error));
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
      setError(getUserFacingErrorMessage(error));
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
      setError(getUserFacingErrorMessage(error));
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
      setError(getUserFacingErrorMessage(error));
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.deleteAccount();
      apiClient.logout();
      hadActiveSessionRef.current = false;
      setUser(null);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
        } catch (storageError) {
          // ignore
        }
      }
      router.replace('/');
      return response;
    } catch (error) {
      setError(getUserFacingErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      apiClient.logout();
      hadActiveSessionRef.current = false;
      setUser(null);
      setError(null);
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
        } catch (storageError) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    login,
    register,
    updateProfile,
    updatePreferences,
    deleteAccount,
    logout,
    loading,
    error,
    clearError,
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
