'use client';
import { useState } from 'react';
import AuthForm from '@/components/Login/AuthForm';
import Navbar from '@/components/Navbar';
import { Leaf, Sun, Droplets, Sprout, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 opacity-10">
          <Leaf className="w-32 h-32 text-green-600 transform rotate-12" />
        </div>
      <div className="absolute bottom-20 right-20 opacity-10">
        <Sprout className="w-24 h-24 text-emerald-600 transform -rotate-12" />
      </div>

      <Navbar />

      <main className="flex items-center justify-center px-6 py-12 pt-24">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Banner */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
                Make and Build Your 
                <span className="text-green-600 block">Garden Here!</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Transform your outdoor space with our professional garden design tools and expert guidance.
              </p>
            </div>

            {/* Garden Screenshots */}
            <div className="my-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg shadow-md overflow-hidden">
                  <img 
                    src="/Garden_Planner.png" 
                    alt="Garden Planner Interface" 
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="rounded-lg shadow-md overflow-hidden">
                  <img 
                    src="/My_Garden.png" 
                    alt="Our garden list page" 
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div> 

            {/* Features */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Sprout className="w-6 h-6 text-green-600 mr-2" />
                We Offer...
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                    <Leaf className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-lg font-medium text-gray-700">Personal Garden Design</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                    <Sprout className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-lg font-medium text-gray-700">Tips & Guidance</span>
                </div>
                <div className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-lg font-medium text-gray-700">Tracking & Analytics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Login Container */}
          <div className="max-w-md mx-auto w-full">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h2>
                <p className="text-gray-600">Sign in or create an account to start planning your garden</p>
              </div>

              <AuthForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}