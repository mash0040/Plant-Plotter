import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';
import {
  API_ERROR_CODES,
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE
} from './apiErrors';

const createJsonResponse = ({ status, body, headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (name) => headers[name] || headers[name.toLowerCase()] || null
  },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body))
});

describe('apiClient error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });

  it('handles HTTP 503 separately from other failures', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 503,
      body: {
        message: SERVICE_UNAVAILABLE_MESSAGE,
        code: API_ERROR_CODES.SERVICE_UNAVAILABLE
      },
      headers: {
        'Retry-After': '60'
      }
    }));

    await expect(apiClient.getGardenSummaries()).rejects.toMatchObject({
      status: 503,
      code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
      message: SERVICE_UNAVAILABLE_MESSAGE,
      retryAfter: '60'
    });
  });

  it('maps HTTP 500 to the generic server error message', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 500,
      body: {
        message: 'ER_BAD_FIELD_ERROR: unknown column password_hash'
      }
    }));

    await expect(apiClient.getGardenSummaries()).rejects.toMatchObject({
      status: 500,
      code: API_ERROR_CODES.SERVER_ERROR,
      message: SERVER_ERROR_MESSAGE
    });
  });

  it('maps fetch failures to a network error instead of a service-unavailable error', async () => {
    fetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiClient.getGardenSummaries()).rejects.toMatchObject({
      status: 0,
      code: API_ERROR_CODES.NETWORK_ERROR,
      message: NETWORK_ERROR_MESSAGE
    });
  });

  it('clears the stored session and notifies listeners for protected-route 401 responses', async () => {
    localStorage.setItem('token', 'token-value');
    localStorage.setItem('authToken', 'token-value');
    localStorage.setItem('user', JSON.stringify({ username: 'Demo User' }));

    const authExpiredListener = vi.fn();
    window.addEventListener('plantplotter:auth-expired', authExpiredListener);

    fetch.mockResolvedValue(createJsonResponse({
      status: 401,
      body: {
        message: 'jwt expired',
        code: 'TOKEN_EXPIRED'
      }
    }));

    await expect(apiClient.getProfile()).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Your session expired. Please sign in again.'
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(authExpiredListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('plantplotter:auth-expired', authExpiredListener);
  });

  it('keeps login 401 responses as invalid-credentials errors', async () => {
    localStorage.setItem('token', 'existing-token');

    fetch.mockResolvedValue(createJsonResponse({
      status: 401,
      body: {
        message: 'Invalid credentials'
      }
    }));

    await expect(apiClient.login('demo@example.com', 'wrong-password')).rejects.toMatchObject({
      status: 401,
      code: API_ERROR_CODES.AUTH_REQUIRED,
      message: 'Invalid credentials'
    });

    expect(localStorage.getItem('token')).toBe('existing-token');
  });

  it('stores successful login tokens only under the current token key', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: {
        token: 'new-login-token',
        user: {
          id: 1,
          username: 'Demo User',
          email: 'demo@example.com'
        }
      },
      headers: {
        'content-type': 'application/json'
      }
    }));

    await apiClient.login('demo@example.com', 'password');

    expect(localStorage.getItem('token')).toBe('new-login-token');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({
      username: 'Demo User',
      email: 'demo@example.com'
    });
  });

  it('stores successful registration tokens only under the current token key', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 201,
      body: {
        token: 'new-register-token',
        user: {
          id: 2,
          username: 'New User',
          email: 'new@example.com'
        }
      },
      headers: {
        'content-type': 'application/json'
      }
    }));

    await apiClient.register('New User', 'new@example.com', 'Password123');

    expect(localStorage.getItem('token')).toBe('new-register-token');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({
      username: 'New User',
      email: 'new@example.com'
    });
  });

  it('keeps reading the legacy authToken key for existing sessions', async () => {
    localStorage.setItem('authToken', 'legacy-token');

    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: {
        id: 1,
        username: 'Demo User',
        email: 'demo@example.com'
      },
      headers: {
        'content-type': 'application/json'
      }
    }));

    await apiClient.getProfile();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/users/profile'), expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer legacy-token'
      })
    }));
  });
});
