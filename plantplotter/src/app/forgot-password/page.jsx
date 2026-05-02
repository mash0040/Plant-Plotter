'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Leaf, Mail } from 'lucide-react';
import apiClient from '@/lib/api';
import { validateEmail } from '@/lib/emailValidation';

const SUCCESS_MESSAGE = 'If an account exists, we sent password reset instructions.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.forgotPassword(trimmedEmail);
      setSuccessMessage(SUCCESS_MESSAGE);
    } catch (requestError) {
      setError(requestError.message || 'Unable to request password reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your email and we will send reset instructions.</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setSuccessMessage('');
              }}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending instructions...
              </>
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
