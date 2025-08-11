'use client';
import React from 'react';
import { X, Thermometer, Droplets, Wind, Cloud, Eye, Gauge, TrendingUp, TrendingDown, MapPin, Clock, Sun, CloudRain } from 'lucide-react';
import { getWeatherDescription, getWindDirection } from '@/hooks/useWeather';

// Helper function to determine comfort level
function getComfortLevel(temp, humidity, windSpeed) {
  if (temp < -10) return "Very Cold";
  if (temp < 0) return "Cold";
  if (temp < 10) return "Cool";
  if (temp > 35) return "Very Hot";
  if (temp > 28) return "Hot";
  
  if (humidity > 80) return "Very Humid";
  if (humidity < 20) return "Very Dry";
  if (windSpeed > 30) return "Very Windy";
  if (windSpeed > 20) return "Windy";
  
  if (temp >= 18 && temp <= 24 && humidity >= 40 && humidity <= 60) {
    return "Perfect";
  }
  if (temp >= 15 && temp <= 28 && humidity >= 30 && humidity <= 70) {
    return "Comfortable";
  }
  
  return "Moderate";
}

// Helper function for UV advice based on cloud cover
function getUVAdvice(cloudCover) {
  if (cloudCover >= 80) return "Low UV (Cloudy)";
  if (cloudCover >= 50) return "Moderate UV";
  if (cloudCover >= 20) return "High UV";
  return "Very High UV";
}

// Helper function for detailed gardening advice
function getDetailedGardeningAdvice(weatherData) {
  const advice = [];
  const { current, daily } = weatherData;
  const temp = current.temperature;
  const humidity = current.humidity;
  const wind = current.windSpeed;
  const precipitation = current.precipitation;
  const cloudCover = current.cloudCover;
  
  // Temperature advice
  if (temp >= 18 && temp <= 25) {
    advice.push({
      type: 'good',
      icon: '🌡️',
      title: 'Ideal Temperature',
      description: `${temp}°C is perfect for most gardening activities including planting, watering, and maintenance.`
    });
  } else if (temp < 5) {
    advice.push({
      type: 'bad',
      icon: '🥶',
      title: 'Too Cold',
      description: 'Protect sensitive plants from frost. Focus on indoor gardening or planning activities.'
    });
  } else if (temp > 30) {
    advice.push({
      type: 'warning',
      icon: '🔥',
      title: 'Very Hot',
      description: 'Water early morning or evening. Provide shade for sensitive plants. Avoid midday activities.'
    });
  }
  
  // Precipitation advice
  if (precipitation > 5) {
    advice.push({
      type: 'bad',
      icon: '🌧️',
      title: 'Heavy Rain',
      description: 'Skip watering today. Avoid working with soil to prevent compaction. Good time for planning.'
    });
  } else if (precipitation > 0) {
    advice.push({
      type: 'good',
      icon: '💧',
      title: 'Light Rain',
      description: 'Natural watering! Skip irrigation today. Perfect for transplanting when rain stops.'
    });
  } else if (humidity < 30) {
    advice.push({
      type: 'warning',
      icon: '🏜️',
      title: 'Low Humidity',
      description: 'Plants may need extra water. Check soil moisture frequently. Mist leafy plants.'
    });
  }
  
  // Wind advice
  if (wind > 25) {
    advice.push({
      type: 'warning',
      icon: '💨',
      title: 'Very Windy',
      description: 'Secure tall plants and stakes. Avoid spraying treatments. Delay planting small seedlings.'
    });
  } else if (wind > 15) {
    advice.push({
      type: 'warning',
      icon: '🌬️',
      title: 'Windy Conditions',
      description: 'Good ventilation for plants, but check supports for tall plants.'
    });
  }
  
  // Sun/cloud advice
  if (current.isDay && cloudCover < 30) {
    advice.push({
      type: 'good',
      icon: '☀️',
      title: 'Sunny Weather',
      description: 'Great for photosynthesis! Ensure adequate watering. Perfect for sun-loving plants.'
    });
  } else if (cloudCover > 70) {
    advice.push({
      type: 'good',
      icon: '☁️',
      title: 'Overcast',
      description: 'Good conditions for transplanting. Reduced water stress. Ideal for working outdoors.'
    });
  }
  
  // Perfect day advice
  if (temp >= 15 && temp <= 25 && precipitation === 0 && wind < 15) {
    advice.push({
      type: 'good',
      icon: '🌟',
      title: 'Perfect Gardening Day',
      description: 'Excellent conditions for all outdoor gardening activities. Make the most of today!'
    });
  }
  
  return advice;
}

export default function DetailedWeatherModal({ isOpen, onClose, weatherData }) {
  if (!isOpen || !weatherData) return null;

  const weather = getWeatherDescription(weatherData.current.weatherCode, weatherData.current.isDay);
  const windDir = getWindDirection(weatherData.current.windDirection);

  // Get hourly forecast for next 12 hours
  const getHourlyForecast = () => {
    if (!weatherData.hourly) return [];
    
    return weatherData.hourly.times.slice(0, 12).map((time, index) => ({
      time: new Date(time).getHours(),
      temp: Math.round(weatherData.hourly.temperatures[index]),
      weatherCode: weatherData.hourly.weatherCodes[index],
      humidity: weatherData.hourly.humidity[index]
    }));
  };

  const hourlyForecast = getHourlyForecast();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weather.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Ottawa Weather Details
              </h2>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>45.42°N, 75.70°W</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Current Weather */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Current Conditions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Temperature Card */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-gray-800 dark:text-white">Temperature</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weatherData.current.temperature}°C
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Feels like {weatherData.current.feelsLike}°C
                </div>
                {weatherData.daily && (
                  <div className="flex gap-3 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-red-600">
                      <TrendingUp className="w-3 h-3" />
                      {weatherData.daily.maxTemp}°
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <TrendingDown className="w-3 h-3" />
                      {weatherData.daily.minTemp}°
                    </span>
                  </div>
                )}
              </div>

              {/* Humidity Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-800 dark:text-white">Humidity</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weatherData.current.humidity}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {weatherData.current.humidity > 60 ? 'High humidity' : 
                   weatherData.current.humidity < 30 ? 'Low humidity' : 'Moderate humidity'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Wind */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-800 dark:text-white text-sm">Wind</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {weatherData.current.windSpeed} km/h
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {windDir} ({weatherData.current.windDirection}°)
                </div>
              </div>

              {/* Cloud Cover */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-800 dark:text-white text-sm">Clouds</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {weatherData.current.cloudCover}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {weather.description}
                </div>
              </div>

              {/* Precipitation */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-800 dark:text-white text-sm">Precipitation</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {weatherData.current.precipitation} mm
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {weatherData.current.precipitation > 0 ? 'Currently raining' : 'No precipitation'}
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Forecast */}
          {hourlyForecast.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">12-Hour Forecast</h3>
              
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2">
                  {hourlyForecast.map((hour, index) => {
                    const hourWeather = getWeatherDescription(hour.weatherCode);
                    const isCurrentHour = hour.time === new Date().getHours();
                    
                    return (
                      <div 
                        key={index}
                        className={`flex-shrink-0 text-center p-3 rounded-lg border min-w-[80px] ${
                          isCurrentHour 
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'
                        }`}
                      >
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {isCurrentHour ? 'Now' : `${hour.time}:00`}
                        </div>
                        <div className="text-lg mb-1">{hourWeather.icon}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {hour.temp}°
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {hour.humidity}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Additional Weather Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Comfort Index */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-800 dark:text-white text-sm">Comfort Level</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {getComfortLevel(weatherData.current.temperature, weatherData.current.humidity, weatherData.current.windSpeed)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Based on temperature, humidity & wind
                </div>
              </div>

              {/* UV Index */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-gray-800 dark:text-white text-sm">UV Conditions</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {weatherData.current.isDay ? getUVAdvice(weatherData.current.cloudCover) : 'Night Time'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {weatherData.current.isDay ? 'Sun protection recommendation' : 'No UV exposure'}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Gardening Recommendations */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">🌱 Detailed Gardening Advice</h3>
            
            <div className="space-y-3">
              {getDetailedGardeningAdvice(weatherData).map((advice, index) => (
                <div key={index} className={`p-3 rounded-lg border ${advice.type === 'good' 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                  : advice.type === 'warning' 
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">{advice.icon}</span>
                    <div>
                      <div className={`font-medium text-sm ${
                        advice.type === 'good' ? 'text-green-800 dark:text-green-300' :
                        advice.type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
                        'text-red-800 dark:text-red-300'
                      }`}>
                        {advice.title}
                      </div>
                      <div className={`text-xs mt-1 ${
                        advice.type === 'good' ? 'text-green-700 dark:text-green-400' :
                        advice.type === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                        'text-red-700 dark:text-red-400'
                      }`}>
                        {advice.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Data Source */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span>Data from Open-Meteo API • Updated every 10 minutes</span>
            </div>
            <div className="text-xs">
              Weather models: NOAA GFS, Environment Canada, ECMWF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}