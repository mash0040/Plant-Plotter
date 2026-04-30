'use client';
import React from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Thermometer, RotateCcw, MapPin, Clock, Eye, Gauge } from 'lucide-react';
import { useWeather, getWeatherDescription, getGardeningAdvice, getWindDirection } from '@/hooks/useWeather';

export default function WeatherWidget() {
  const { weatherData, loading, error, lastUpdated, refreshWeather } = useWeather();

  if (loading && !weatherData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Sun className="w-5 h-5 text-yellow-500 animate-pulse" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Weather</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Sun className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Weather</h3>
        </div>
        <div className="text-red-600 text-sm">
          Failed to load weather data
        </div>
        <button 
          onClick={refreshWeather}
          className="mt-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  if (!weatherData) return null;

  const weather = getWeatherDescription(weatherData.current.weatherCode, weatherData.current.isDay);
  const gardeningAdvice = getGardeningAdvice(weatherData);
  const windDir = getWindDirection(weatherData.current.windDirection);

  // Format last updated time
  const formatLastUpdated = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 60000); // minutes
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-blue-700">{weather.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Ottawa Weather</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>45.42°N, 75.70°W</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={refreshWeather}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Refresh weather data"
        >
          <RotateCcw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Weather Info */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {weatherData.current.temperature}°C
          </div>
          <div className="text-sm text-gray-500">
            Feels like {weatherData.current.feelsLike}°C
          </div>
        </div>
        
        <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">
          {weather.description}
        </div>
        
        {weatherData.daily && (
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span>H:{weatherData.daily.maxTemp}°</span>
            <span>L:{weatherData.daily.minTemp}°</span>
          </div>
        )}
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Droplets className="w-3 h-3 text-blue-500" />
          <span>{weatherData.current.humidity}%</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Wind className="w-3 h-3 text-gray-500" />
          <span>{weatherData.current.windSpeed} km/h {windDir}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Cloud className="w-3 h-3 text-gray-400" />
          <span>{weatherData.current.cloudCover}% clouds</span>
        </div>
        
        {weatherData.current.precipitation > 0 && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <CloudRain className="w-3 h-3 text-blue-600" />
            <span>{weatherData.current.precipitation}mm</span>
          </div>
        )}
      </div>

      {/* Gardening Advice */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-3">
        <div className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
          Gardening Advice
        </div>
        <div className="text-xs text-green-700 dark:text-green-400">
          {gardeningAdvice}
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Updated {formatLastUpdated(lastUpdated)}</span>
          </div>
          {error && !weatherData.isFallback && (
            <span className="text-yellow-600" title={error}>
              ⚠️ Using cached data
            </span>
          )}
          {error && weatherData.isFallback && (
            <span className="text-yellow-600" title={error}>
              Using fallback demo weather
            </span>
          )}
        </div>
      )}
    </div>
  );
}
