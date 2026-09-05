'use client';
import { useState, useEffect, useRef } from 'react';
import { User, Mail, Save, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getActionErrorMessage } from '@/lib/apiErrors';
import { validateEmail } from '@/lib/emailValidation';

export default function ProfileForm() {
  const { user, updateProfile, deleteAccount, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const messageRef = useRef(null);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!message.text || !messageRef.current) return;

    messageRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [message.text]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Display name is required';
    } else if (formData.username.length < 2) {
      newErrors.username = 'Display name must be at least 2 characters';
    }
    
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Review the highlighted fields.' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateProfile({
        ...formData,
        username: formData.username.trim(),
        email: formData.email.trim()
      });
      setMessage({ type: 'success', text: 'Profile updated.' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: getActionErrorMessage(
          error,
          'Your profile could not be updated.',
          'Review your changes and try again.'
        )
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setMessage({ type: '', text: '' });

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (error) {
      setDeleteError(getActionErrorMessage(error, 'Your account could not be deleted.', 'No account data was removed.'));
      setIsDeletingAccount(false);
    }
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
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Profile Settings</h2>
      </div>

      {/* Status Message */}
      {message.text && (
        <div ref={messageRef} role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Display Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="profile-display-name">
            Display Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="profile-display-name"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                errors.username
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
              }`}
              placeholder="How your name appears in PlantPlotter"
              autoComplete="name"
              disabled={isSubmitting}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Display name is shown in the app. It does not need to be unique - your account is identified by email.
          </p>
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="profile-email">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="profile-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                errors.email
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
              }`}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Email is used to sign in and must be unique.
          </p>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Account Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700">Role:</span>
              <span className="ml-2 font-medium capitalize">{user?.role || 'User'}</span>
            </div>
            <div>
              <span className="text-gray-700">Member since:</span>
              <span className="ml-2 font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
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
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-red-100 pt-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Danger Zone</h3>
              <p className="mt-1 text-sm text-red-800">
                Deleting your account is permanent. Your account, gardens, planted items, tracker activities, and tasks will be removed.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteError('');
                    setDeleteConfirmation('');
                  }}
                  disabled={isSubmitting || isDeletingAccount}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-red-900" htmlFor="delete-account-confirmation">
                    Type DELETE to permanently delete your account.
                  </label>
                  <input
                    id="delete-account-confirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) => {
                      setDeleteConfirmation(event.target.value);
                      setDeleteError('');
                    }}
                    className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    autoComplete="off"
                    disabled={isDeletingAccount}
                  />
                  {deleteError && (
                    <p className="text-sm text-red-700">{deleteError}</p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmation('');
                        setDeleteError('');
                      }}
                      disabled={isDeletingAccount}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      {isDeletingAccount ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Permanently Delete Account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
