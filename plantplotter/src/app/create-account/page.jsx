'use client';
import { useEffect } from 'react';
import AuthForm from '@/components/Login/AuthForm';
import { Leaf } from 'lucide-react';

export default function CreateAccountPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
          <p className="text-gray-700">Start planning and tracking your gardens.</p>
        </div>

        <AuthForm initialMode="register" />
      </div>
    </div>
  );
}
