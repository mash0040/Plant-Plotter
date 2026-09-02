'use client';
import React from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, RotateCcw, MapPin, Clock, Eye } from 'lucide-react';
import { formatWeatherCoordinates, getWeatherDescription, getGardeningAdvice, getWindDirection } from '@/hooks/useWeather';

export default function WeatherWidget({ weatherState, onViewDetails }) {
  const { weatherData, loading, error, lastUpdated, refreshWeather } = weatherState;

  const handleRefreshClick = (event) => {
    event.stopPropagation();
    refreshWeather();
  };

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
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={handleRefreshClick}
          className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex min-w-0 items-start space-x-2">
          <span className="text-sm font-semibold text-blue-700">{weather.icon}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">{weatherData.location.label}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>{formatWeatherCoordinates(weatherData.location)}</span>
            </div>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleRefreshClick}
          className="touch-target flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:hover:bg-gray-700"
          title="Refresh weather data"
          aria-label="Refresh weather data"
        >
          <RotateCcw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Weather Info */}
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
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
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mb-4 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
          <Droplets className="w-3 h-3 text-blue-500" />
          <span>{weatherData.current.humidity}%</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
          <Wind className="w-3 h-3 text-gray-500" />
          <span className="break-words">{weatherData.current.windSpeed} km/h {windDir}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
          <Cloud className="w-3 h-3 text-gray-400" />
          <span>{weatherData.current.cloudCover}% clouds</span>
        </div>
        
        {weatherData.current.precipitation > 0 && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 min-w-0">
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
        <div className="text-xs text-green-700 dark:text-green-400 break-words">
          {gardeningAdvice}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>{error}</p>
          <p className="mt-1">Showing weather from the last successful update.</p>
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={loading}
            className="touch-target mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Try again
          </button>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Updated {formatLastUpdated(lastUpdated)}</span>
          </div>
        </div>
      )}

      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="touch-target mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
        >
          <Eye className="h-4 w-4" />
          View weather details
        </button>
      )}
    </div>
  );
}
