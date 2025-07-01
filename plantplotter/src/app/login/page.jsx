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

            {/* Image Mockups */}
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[4/3] bg-gradient-to-br from-orange-200 to-red-200 rounded-xl shadow-lg overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-orange-300 to-red-300 flex items-center justify-center">
                  <span className="text-orange-800 font-semibold text-sm">Garden Gallery</span>
                </div>
              </div>
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-200 to-green-200 rounded-xl shadow-lg overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-sky-300 to-emerald-300 flex items-center justify-center">
                  <span className="text-emerald-800 font-semibold text-sm">Design Tools</span>
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
                <p className="text-gray-600">Sign in to start planning your garden</p>
              </div>

              <AuthForm />

              <div className="mt-6 text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/90 text-gray-500">
                      New to PlantPlotter?
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm">
                  Don't have an account? 
                  <a href="#" className="text-green-600 hover:text-green-700 font-medium ml-1 hover:underline">
                    Sign up here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}