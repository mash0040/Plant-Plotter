'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, Info } from 'lucide-react';
import { useAuth, SESSION_EXPIRED_FLAG } from '@/hooks/useAuth';
import { getActionErrorMessage } from '@/lib/apiErrors';
import { validateNewPassword, PASSWORD_RULES_HINT } from '@/lib/passwordValidation';
import { validateEmail } from '@/lib/emailValidation';

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

export default function AuthForm({ initialMode = 'login' }) {
  const router = useRouter();
  const { login, register, loading, clearError } = useAuth();

  const mode = initialMode === 'register' ? 'register' : 'login';
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');

  // One-time session-expired notice: only shown when the user lost an active
  // session (set by AuthProvider). Manual nav to /login should never see this.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const flag = window.sessionStorage.getItem(SESSION_EXPIRED_FLAG);
      if (flag) {
        setSessionNotice('Your session expired. Please sign in again.');
        window.sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      }
    } catch (storageError) {
      // ignore
    }
    // Always clear any sticky context error when arriving on the form fresh.
    if (clearError) clearError();
  }, [clearError]);

  useEffect(() => {
    setFormData(EMPTY_FORM);
    setLocalError('');
    setSessionNotice('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setLocalError('');
    setSessionNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSessionNotice('');

    // Custom empty-field checks (form has noValidate, so the browser will
    // not show its own "Please fill out this field" bubble).
    const trimmedEmail = formData.email.trim();
    if (mode === 'register' && !formData.name.trim()) {
      setLocalError('Display name is required');
      return;
    }
    if (!trimmedEmail) {
      setLocalError('Email is required');
      return;
    }
    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      setLocalError(emailError);
      return;
    }
    if (!formData.password) {
      setLocalError('Password is required');
      return;
    }
    if (mode === 'register' && !formData.confirmPassword) {
      setLocalError('Please confirm your password');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(trimmedEmail, formData.password);
        router.push('/gardens');
      } else {
        const passwordError = validateNewPassword(formData.password);
        if (passwordError) {
          throw new Error(passwordError);
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await register(formData.name.trim(), trimmedEmail, formData.password);
        router.push('/gardens');
      }
    } catch (err) {
      const actionMessage = mode === 'login'
        ? 'Sign in could not be completed.'
        : 'Your account could not be created.';
      const recoveryMessage = mode === 'login'
        ? 'Check your details and try again.'
        : 'Review your details and try again.';
      setLocalError(getActionErrorMessage(err, actionMessage, recoveryMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError;
  const passwordAutocomplete = mode === 'register' ? 'new-password' : 'current-password';
  const passwordPlaceholder = mode === 'register'
    ? `Create password (${PASSWORD_RULES_HINT.toLowerCase()})`
    : 'Password';

  return (
    <div className="space-y-6">
      {sessionNotice && !displayError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm">{sessionNotice}</p>
        </div>
      )}

      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{displayError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-display-name" className="mb-2 block text-sm font-medium text-gray-800">
                Display name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="auth-display-name"
                  type="text"
                  placeholder="Display name"
                  autoComplete="name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-gray-800">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="auth-email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isSubmitting || loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-gray-800">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={passwordPlaceholder}
                autoComplete={passwordAutocomplete}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isSubmitting || loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center rounded-r-xl pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-medium text-gray-800">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isSubmitting || loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-xl pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting || loading}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {PASSWORD_RULES_HINT}
              </p>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center"
        >
          {isSubmitting || loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>

      <div className="text-center text-sm text-gray-700">
        <div className="mt-3">
          {mode === 'login' ? (
            <p>
              Need an account?{' '}
              <Link
                href="/create-account"
                className="text-green-700 hover:text-green-800 font-medium hover:underline"
              >
                Create one
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-green-700 hover:text-green-800 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
