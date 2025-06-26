'use client';
import React from 'react';
import { Sun } from 'lucide-react';

export default function WeatherWidget() {
  // This would typically come from props or a weather API
  const weatherData = {
    temp: 24,
    condition: 'Sunny',
    description: 'Light breeze',
    humidity: 65
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-center space-x-2 mb-3">
        <Sun className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Today Weather:</h3>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {weatherData.temp}°C
      </div>
      <div className="text-gray-600 dark:text-gray-400">
        {weatherData.condition}, {weatherData.description}
      </div>
      <div className="text-sm text-green-600 dark:text-green-400 mt-2">
        Perfect day for gardening
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Humidity: {weatherData.humidity}%
      </div>
    </div>
  );
}