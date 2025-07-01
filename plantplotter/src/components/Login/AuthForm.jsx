'use client';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      alert(`Login attempt: ${email}`);
      setIsLoading(false);
    }, 1000);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      alert(`Password reset link sent to: ${resetEmail}`);
      setIsLoading(false);
      setShowForgotPassword(false);
      setResetEmail('');
    }, 1000);
  };

  if (showForgotPassword) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Reset Password
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Enter your email to receive a password reset link
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium py-2 transition-colors"
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="email"
            placeholder="Email address"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
        >
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}