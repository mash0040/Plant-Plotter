import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import {
  LOCATION_ACCESS_ERROR_MESSAGE,
  WEATHER_SERVICE_ERROR_MESSAGE,
  resolveWeatherLocation,
  useWeather
} from './useWeather';

const createWeatherResponse = () => ({
  current: {
    temperature_2m: 21.6,
    apparent_temperature: 22.1,
    relative_humidity_2m: 61,
    wind_speed_10m: 9.4,
    wind_direction_10m: 180,
    cloud_cover: 20,
    precipitation: 0,
    weather_code: 0,
    is_day: 1,
    time: '2026-08-31T12:00'
  },
  daily: {
    temperature_2m_max: [25],
    temperature_2m_min: [17],
    weather_code: [0],
    precipitation_sum: [0]
  },
  hourly: {
    time: ['2026-08-31T12:00'],
    temperature_2m: [22],
    weather_code: [0],
    relative_humidity_2m: [61]
  },
  current_units: { temperature_2m: '°C' },
  latitude: 43.6532,
  longitude: -79.3832,
  timezone: 'America/Toronto'
});

const createWidgetWeatherData = () => ({
  current: {
    temperature: 22,
    feelsLike: 22,
    humidity: 61,
    windSpeed: 9,
    windDirection: 180,
    cloudCover: 20,
    precipitation: 0,
    weatherCode: 0,
    isDay: 1
  },
  daily: { maxTemp: 25, minTemp: 17 },
  location: {
    latitude: 43.6532,
    longitude: -79.3832,
    label: 'Weather near you',
    source: 'device'
  }
});

const mockGeolocationSuccess = () => {
  const getCurrentPosition = vi.fn((handleSuccess) => {
    handleSuccess({ coords: { latitude: 43.6532, longitude: -79.3832 } });
  });

  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
};

const mockGeolocationFailure = () => {
  const getCurrentPosition = vi.fn((handleSuccess, handleError) => {
    handleError({ code: 1 });
  });

  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
};

const successfulFetchResponse = () => ({
  ok: true,
  json: vi.fn().mockResolvedValue(createWeatherResponse())
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('weather location resolution', () => {
  it('uses browser coordinates when location access succeeds', async () => {
    mockGeolocationSuccess();

    await expect(resolveWeatherLocation()).resolves.toEqual({
      latitude: 43.6532,
      longitude: -79.3832,
      label: 'Weather near you',
      source: 'device'
    });
  });

  it('does not substitute another location when access fails', async () => {
    mockGeolocationFailure();

    await expect(resolveWeatherLocation()).rejects.toThrow(LOCATION_ACCESS_ERROR_MESSAGE);
  });
});

describe('useWeather', () => {
  it('loads local weather with device coordinates and automatic timezone', async () => {
    mockGeolocationSuccess();
    const fetchMock = vi.fn().mockResolvedValue(successfulFetchResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('latitude=43.6532&longitude=-79.3832'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('timezone=auto'));
    expect(result.current.weatherData.location.label).toBe('Weather near you');
    expect(result.current.error).toBeNull();
  });

  it('shows a location-access error and does not call Open-Meteo when permission is denied', async () => {
    mockGeolocationFailure();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.weatherData).toBeNull();
    expect(result.current.error).toBe(LOCATION_ACCESS_ERROR_MESSAGE);
    expect(result.current.errorType).toBe('location');
  });

  it('shows a weather-service error without creating sample data when Open-Meteo fails', async () => {
    mockGeolocationSuccess();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.weatherData).toBeNull();
    expect(result.current.error).toBe(WEATHER_SERVICE_ERROR_MESSAGE);
    expect(result.current.errorType).toBe('weather');
  });

  it('retries location access after an initial denial', async () => {
    const getCurrentPosition = vi.fn()
      .mockImplementationOnce((handleSuccess, handleError) => handleError({ code: 1 }))
      .mockImplementationOnce((handleSuccess) => handleSuccess({
        coords: { latitude: 43.6532, longitude: -79.3832 }
      }));
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successfulFetchResponse()));

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.errorType).toBe('location'));

    await act(async () => {
      await result.current.refreshWeather();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.weatherData.location.label).toBe('Weather near you');
  });

  it('keeps the last successful local forecast when a refresh fails', async () => {
    mockGeolocationSuccess();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(successfulFetchResponse())
      .mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.weatherData?.location.label).toBe('Weather near you'));
    const previousWeatherData = result.current.weatherData;

    await act(async () => {
      await result.current.refreshWeather();
    });

    expect(result.current.weatherData).toBe(previousWeatherData);
    expect(result.current.error).toBe(WEATHER_SERVICE_ERROR_MESSAGE);
    expect(result.current.errorType).toBe('weather');
  });
});

describe('WeatherWidget', () => {
  it('shows local weather and coordinates', () => {
    render(
      <WeatherWidget
        weatherState={{
          weatherData: createWidgetWeatherData(),
          loading: false,
          error: null,
          lastUpdated: new Date(),
          refreshWeather: vi.fn()
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Weather near you' })).toBeInTheDocument();
    expect(screen.getByText('43.65°N, 79.38°W')).toBeInTheDocument();
  });

  it('opens weather details only from the explicit details action', async () => {
    const refreshWeather = vi.fn();
    const handleViewDetails = vi.fn();
    const user = userEvent.setup();

    render(
      <WeatherWidget
        weatherState={{
          weatherData: createWidgetWeatherData(),
          loading: false,
          error: null,
          lastUpdated: new Date(),
          refreshWeather
        }}
        onViewDetails={handleViewDetails}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Refresh weather data' }));
    expect(refreshWeather).toHaveBeenCalledTimes(1);
    expect(handleViewDetails).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'View weather details' }));
    expect(handleViewDetails).toHaveBeenCalledTimes(1);
  });

  it('shows the location message and retries without opening weather details', async () => {
    const refreshWeather = vi.fn();
    const handleOpenDetails = vi.fn();
    const user = userEvent.setup();

    render(
      <div onClick={handleOpenDetails}>
        <WeatherWidget
          weatherState={{
            weatherData: null,
            loading: false,
            error: LOCATION_ACCESS_ERROR_MESSAGE,
            errorType: 'location',
            lastUpdated: null,
            refreshWeather
          }}
        />
      </div>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(LOCATION_ACCESS_ERROR_MESSAGE);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(refreshWeather).toHaveBeenCalledTimes(1);
    expect(handleOpenDetails).not.toHaveBeenCalled();
  });

  it('labels retained local data after a weather-service refresh failure', () => {
    render(
      <WeatherWidget
        weatherState={{
          weatherData: createWidgetWeatherData(),
          loading: false,
          error: WEATHER_SERVICE_ERROR_MESSAGE,
          errorType: 'weather',
          lastUpdated: new Date(),
          refreshWeather: vi.fn()
        }}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(WEATHER_SERVICE_ERROR_MESSAGE);
    expect(screen.getByRole('alert')).toHaveTextContent('Showing weather from the last successful update.');
  });
});
