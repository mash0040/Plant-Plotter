'use client';
import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Globe, Palette, Bell, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PreferencesForm() {
  const { user, updatePreferences, loading } = useAuth();
  
  const [preferences, setPreferences] = useState({
    language: 'en',
    theme: 'light',
    notifications: {
      email: true,
      push: false,
      gardenReminders: true,
      weatherAlerts: true
    },
    privacy: {
      profileVisible: true,
      shareGardens: false
    },
    garden: {
      defaultUnits: 'metric',
      autoSave: true,
      gridSize: 40
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load user preferences on mount
  useEffect(() => {
    if (user?.preferences) {
      try {
        const userPrefs = typeof user.preferences === 'string' 
          ? JSON.parse(user.preferences) 
          : user.preferences;
        
        setPreferences(prev => ({
          ...prev,
          ...userPrefs
        }));
      } catch (error) {
        console.error('Error parsing user preferences:', error);
      }
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setIsSubmitting(true);
    
    try {
      // TODO: Implement updatePreferences in useAuth hook
      await updatePreferences(preferences);
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save preferences' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePreference = (path, value) => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Settings className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Preferences</h2>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">General</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => updatePreference('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">Email Notifications</span>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifications?.email || false}
                onChange={(e) => updatePreference('notifications.email', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">Garden Reminders</span>
                <p className="text-sm text-gray-500">Reminders for watering, fertilizing, etc.</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifications?.gardenReminders || false}
                onChange={(e) => updatePreference('notifications.gardenReminders', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">Weather Alerts</span>
                <p className="text-sm text-gray-500">Get notified about weather conditions</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.notifications?.weatherAlerts || false}
                onChange={(e) => updatePreference('notifications.weatherAlerts', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>

        {/* Garden Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Garden Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Units
              </label>
              <select
                value={preferences.garden?.defaultUnits || 'metric'}
                onChange={(e) => updatePreference('garden.defaultUnits', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="metric">Metric (cm, m)</option>
                <option value="imperial">Imperial (in, ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grid Size
              </label>
              <select
                value={preferences.garden?.gridSize || 40}
                onChange={(e) => updatePreference('garden.gridSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value={20}>Small (20px)</option>
                <option value={30}>Medium (30px)</option>
                <option value={40}>Large (40px)</option>
                <option value={50}>Extra Large (50px)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-800">Auto-save</span>
              <p className="text-sm text-gray-500">Automatically save garden changes</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.garden?.autoSave || false}
              onChange={(e) => updatePreference('garden.autoSave', e.target.checked)}
              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Privacy</h3>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">Public Profile</span>
                <p className="text-sm text-gray-500">Make your profile visible to other users</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.privacy?.profileVisible || false}
                onChange={(e) => updatePreference('privacy.profileVisible', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">Share Gardens</span>
                <p className="text-sm text-gray-500">Allow others to view your garden designs</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.privacy?.shareGardens || false}
                onChange={(e) => updatePreference('privacy.shareGardens', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}