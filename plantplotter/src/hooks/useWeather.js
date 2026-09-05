'use client';
import { useState, useEffect, useCallback } from 'react';

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 10 * 60 * 1000,
  timeout: 8000
};

export const LOCATION_ACCESS_ERROR_MESSAGE = 'Turn on location access to see weather for your area.';
export const WEATHER_SERVICE_ERROR_MESSAGE = 'Weather services are currently unavailable. Please try again.';

export const resolveWeatherLocation = () => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    reject(new Error(LOCATION_ACCESS_ERROR_MESSAGE));
    return;
  }

  const handleSuccess = (position) => {
    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;
    const hasValidCoordinates = Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;

    if (!hasValidCoordinates) {
      reject(new Error(LOCATION_ACCESS_ERROR_MESSAGE));
      return;
    }

    resolve({
      latitude,
      longitude,
      label: 'Weather near you',
      source: 'device'
    });
  };

  try {
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => reject(new Error(LOCATION_ACCESS_ERROR_MESSAGE)),
      GEOLOCATION_OPTIONS
    );
  } catch {
    reject(new Error(LOCATION_ACCESS_ERROR_MESSAGE));
  }
});

export const formatWeatherCoordinates = ({ latitude, longitude }) => {
  const latitudeDirection = latitude >= 0 ? 'N' : 'S';
  const longitudeDirection = longitude >= 0 ? 'E' : 'W';

  return `${Math.abs(latitude).toFixed(2)}°${latitudeDirection}, ${Math.abs(longitude).toFixed(2)}°${longitudeDirection}`;
};

export const useWeather = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);

    let weatherLocation;

    try {
      weatherLocation = await resolveWeatherLocation();
    } catch {
      setWeatherData(null);
      setError(LOCATION_ACCESS_ERROR_MESSAGE);
      setErrorType('location');
      setLoading(false);
      return;
    }

    try {
      // Open-Meteo API endpoint for current weather and hourly forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLocation.latitude}&longitude=${weatherLocation.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data into a more usable format
      const transformedData = {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDirection: data.current.wind_direction_10m,
          cloudCover: data.current.cloud_cover,
          precipitation: data.current.precipitation,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day,
          time: data.current.time
        },
        daily: {
          maxTemp: Math.round(data.daily.temperature_2m_max[0]),
          minTemp: Math.round(data.daily.temperature_2m_min[0]),
          weatherCode: data.daily.weather_code[0],
          precipitation: data.daily.precipitation_sum[0]
        },
        hourly: {
          times: data.hourly.time.slice(0, 24), // Next 24 hours
          temperatures: data.hourly.temperature_2m.slice(0, 24),
          weatherCodes: data.hourly.weather_code.slice(0, 24),
          humidity: data.hourly.relative_humidity_2m.slice(0, 24)
        },
        units: data.current_units,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          label: weatherLocation.label,
          source: weatherLocation.source
        }
      };

      setWeatherData(transformedData);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
      setError(WEATHER_SERVICE_ERROR_MESSAGE);
      setErrorType('weather');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch weather data on component mount and set up refresh interval
  useEffect(() => {
    fetchWeatherData();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  // Manual refresh function
  const refreshWeather = useCallback(() => fetchWeatherData(), [fetchWeatherData]);

  return {
    weatherData,
    loading,
    error,
    errorType,
    lastUpdated,
    refreshWeather
  };
};

// Weather code interpretation based on WMO codes used by Open-Meteo
export const getWeatherDescription = (weatherCode, isDay = 1) => {
  const weatherCodes = {
    0: { description: 'Clear sky', icon: isDay ? '☀️' : '🌙', condition: 'Clear' },
    1: { description: 'Mainly clear', icon: isDay ? '🌤️' : '🌙', condition: 'Clear' },
    2: { description: 'Partly cloudy', icon: isDay ? '⛅' : '☁️', condition: 'Partly Cloudy' },
    3: { description: 'Overcast', icon: '☁️', condition: 'Cloudy' },
    45: { description: 'Fog', icon: '🌫️', condition: 'Foggy' },
    48: { description: 'Depositing rime fog', icon: '🌫️', condition: 'Foggy' },
    51: { description: 'Light drizzle', icon: '🌦️', condition: 'Drizzle' },
    53: { description: 'Moderate drizzle', icon: '🌦️', condition: 'Drizzle' },
    55: { description: 'Dense drizzle', icon: '🌧️', condition: 'Drizzle' },
    56: { description: 'Light freezing drizzle', icon: '🌨️', condition: 'Freezing Drizzle' },
    57: { description: 'Dense freezing drizzle', icon: '🌨️', condition: 'Freezing Drizzle' },
    61: { description: 'Slight rain', icon: '🌦️', condition: 'Light Rain' },
    63: { description: 'Moderate rain', icon: '🌧️', condition: 'Rain' },
    65: { description: 'Heavy rain', icon: '🌧️', condition: 'Heavy Rain' },
    66: { description: 'Light freezing rain', icon: '🌨️', condition: 'Freezing Rain' },
    67: { description: 'Heavy freezing rain', icon: '🌨️', condition: 'Freezing Rain' },
    71: { description: 'Slight snow fall', icon: '🌨️', condition: 'Light Snow' },
    73: { description: 'Moderate snow fall', icon: '❄️', condition: 'Snow' },
    75: { description: 'Heavy snow fall', icon: '❄️', condition: 'Heavy Snow' },
    77: { description: 'Snow grains', icon: '🌨️', condition: 'Snow' },
    80: { description: 'Slight rain showers', icon: '🌦️', condition: 'Rain Showers' },
    81: { description: 'Moderate rain showers', icon: '🌧️', condition: 'Rain Showers' },
    82: { description: 'Violent rain showers', icon: '⛈️', condition: 'Heavy Rain Showers' },
    85: { description: 'Slight snow showers', icon: '🌨️', condition: 'Snow Showers' },
    86: { description: 'Heavy snow showers', icon: '❄️', condition: 'Heavy Snow Showers' },
    95: { description: 'Thunderstorm', icon: '⛈️', condition: 'Thunderstorm' },
    96: { description: 'Thunderstorm with slight hail', icon: '⛈️', condition: 'Thunderstorm' },
    99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', condition: 'Thunderstorm' }
  };

  const getWeatherIconLabel = (condition) => {
    if (condition.includes('Clear')) return isDay ? 'Sun' : 'Moon';
    if (condition.includes('Cloud')) return 'Cloud';
    if (condition.includes('Fog')) return 'Fog';
    if (condition.includes('Rain') || condition.includes('Drizzle')) return 'Rain';
    if (condition.includes('Snow')) return 'Snow';
    if (condition.includes('Thunderstorm')) return 'Storm';
    return 'Weather';
  };

  const weather = weatherCodes[weatherCode];
  if (weather) {
    return {
      ...weather,
      icon: getWeatherIconLabel(weather.condition)
    };
  }

  return {
    description: 'Conditions unavailable',
    icon: 'Weather',
    condition: 'Unavailable'
  };
};

// Get gardening advice based on weather conditions
export const getGardeningAdvice = (weatherData) => {
  if (!weatherData) return "Check weather conditions before gardening";

  const { current, daily } = weatherData;
  const weather = getWeatherDescription(current.weatherCode, current.isDay);
  const temp = current.temperature;
  const humidity = current.humidity;
  const wind = current.windSpeed;
  const precipitation = current.precipitation;

  // Temperature-based advice
  if (temp < 0) {
    return "Too cold for most gardening activities. Protect sensitive plants from frost.";
  } else if (temp < 5) {
    return "Cold weather. Consider indoor gardening or greenhouse activities.";
  } else if (temp > 30) {
    return "Very hot. Water plants early morning or evening. Provide shade for sensitive plants.";
  }

  // Weather condition-based advice
  if (precipitation > 0) {
    return "Rainy weather. Skip watering today. Good time for indoor garden planning.";
  } else if (weather.condition.includes('Snow')) {
    return "Snowy conditions. Focus on winter garden maintenance and planning.";
  } else if (weather.condition.includes('Thunderstorm')) {
    return "Stormy weather. Stay indoors and avoid outdoor gardening activities.";
  } else if (wind > 25) {
    return "Very windy. Secure tall plants and avoid spraying treatments.";
  } else if (humidity < 30) {
    return "Low humidity. Extra watering may be needed for plants.";
  } else if (temp >= 15 && temp <= 25 && weather.condition.includes('Clear')) {
    return "Perfect gardening weather! Great time for planting, watering, and maintenance.";
  } else if (temp >= 10 && temp <= 20) {
    return "Good weather for gardening. Ideal for most outdoor activities.";
  }

  return "Check specific plant needs based on current conditions.";
};

// Wind direction helper
export const getWindDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};
