import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';
import {
  API_ERROR_CODES,
  getActionErrorMessage,
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

  it('sends only task status with cookie credentials and CSRF protection', async () => {
    const task = { id: 9, status: 'completed', completed_at: '2026-09-10T12:00:00.000Z' };
    fetch.mockResolvedValue(createJsonResponse({ status: 200, body: task,
      headers: { 'content-type': 'application/json' } }));
    await expect(apiClient.updateTaskStatus(9, 'completed')).resolves.toEqual(task);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/tasks\/9$/), expect.objectContaining({
      method: 'PATCH', credentials: 'include', body: JSON.stringify({ status: 'completed' }),
      headers: expect.objectContaining({ 'X-CSRF-Protection': '1' })
    }));
  });

  it.each([400, 401, 404, 500, 503])('does not retry a failed task status mutation (%s)', async status => {
    fetch.mockResolvedValue(createJsonResponse({ status, body: { message: 'Request failed' } }));
    await expect(apiClient.updateTaskStatus(9, 'completed')).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
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

  it.each([
    {
      status: 401,
      endpoint: '/auth/login',
      code: API_ERROR_CODES.AUTH_REQUIRED,
      message: 'Please sign in to continue.'
    },
    {
      status: 403,
      endpoint: '/gardens',
      code: API_ERROR_CODES.FORBIDDEN,
      message: 'You do not have permission to do that.'
    },
    {
      status: 404,
      endpoint: '/gardens/missing',
      code: API_ERROR_CODES.NOT_FOUND,
      message: 'We could not find what you requested.'
    }
  ])('uses clear fallback copy for HTTP $status responses without a message', async ({
    status,
    endpoint,
    code,
    message
  }) => {
    fetch.mockResolvedValue(createJsonResponse({ status, body: {} }));

    await expect(apiClient.request(endpoint)).rejects.toMatchObject({
      status,
      code,
      message
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

  it('sends an empty garden location as missing data', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 201,
      body: { id: 4, name: 'Kitchen Garden', location: null },
      headers: { 'content-type': 'application/json' }
    }));

    await apiClient.createGarden({
      name: 'Kitchen Garden',
      width: 8,
      height: 6,
      location: '   '
    });

    const requestOptions = fetch.mock.calls[0][1];
    expect(JSON.parse(requestOptions.body)).toMatchObject({ location: null });
  });

  it('preserves missing locations in garden summaries', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: [{ id: 4, name: 'Kitchen Garden', location: null }],
      headers: { 'content-type': 'application/json' }
    }));

    await expect(apiClient.getGardenSummaries()).resolves.toEqual([
      expect.objectContaining({ location: null })
    ]);
  });

  it('keeps the failed action visible when shared recovery copy is used', () => {
    expect(getActionErrorMessage(
      { message: NETWORK_ERROR_MESSAGE, code: API_ERROR_CODES.NETWORK_ERROR },
      'Your layout could not be saved.',
      'Your changes are still here; try again.'
    )).toBe(`Your layout could not be saved. ${NETWORK_ERROR_MESSAGE}`);
  });

  it('preserves a specific API message instead of replacing it with generic action copy', () => {
    expect(getActionErrorMessage(
      { message: 'Invalid credentials', status: 401 },
      'Sign in could not be completed.',
      'Check your details and try again.'
    )).toBe('Invalid credentials');
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

  it('treats the initial cookie check as anonymous without an expired-session event', async () => {
    localStorage.setItem('gardens', JSON.stringify([{ id: 1 }]));
    const authExpiredListener = vi.fn();
    window.addEventListener('plantplotter:auth-expired', authExpiredListener);
    fetch.mockResolvedValue(createJsonResponse({
      status: 401,
      body: {
        message: 'Please sign in to continue.',
        code: 'AUTH_REQUIRED'
      }
    }));

    await expect(apiClient.getProfile({ suppressAuthExpired: true })).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_REQUIRED'
    });

    expect(authExpiredListener).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('gardens'))).toEqual([{ id: 1 }]);
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

  it('uses cookie credentials for login without storing a browser-readable token', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('authToken', 'older-stale-token');
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: {
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

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Protection': '1'
      })
    }));
  });

  it('uses cookie credentials for registration without storing a browser-readable token', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('authToken', 'older-stale-token');
    fetch.mockResolvedValue(createJsonResponse({
      status: 201,
      body: {
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

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Protection': '1'
      })
    }));
  });

  it('uses the session cookie instead of legacy bearer headers on protected requests', async () => {
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
      credentials: 'include'
    }));
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('sends CSRF protection only for unsafe methods', async () => {
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: { id: 1 },
      headers: { 'content-type': 'application/json' }
    }));

    await apiClient.getProfile();
    expect(fetch.mock.calls[0][1].headers['X-CSRF-Protection']).toBeUndefined();

    await apiClient.updateProfile({ username: 'Demo User', email: 'demo@example.com' });
    expect(fetch.mock.calls[1][1].headers['X-CSRF-Protection']).toBe('1');
  });

  it('calls the logout endpoint and clears legacy browser session data', async () => {
    localStorage.setItem('token', 'legacy-token');
    localStorage.setItem('authToken', 'older-token');
    localStorage.setItem('user', JSON.stringify({ username: 'Demo User' }));
    localStorage.setItem('gardens', JSON.stringify([{ id: 1 }]));
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: { message: 'Signed out successfully' },
      headers: { 'content-type': 'application/json' }
    }));

    await apiClient.logout();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Protection': '1'
      })
    }));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('gardens')).toBeNull();
  });

  it('sends account deletion with cookie credentials and clears local cached data', async () => {
    localStorage.setItem('gardens', JSON.stringify([{ id: 1 }]));
    fetch.mockResolvedValue(createJsonResponse({
      status: 200,
      body: { message: 'Account deleted successfully' },
      headers: { 'content-type': 'application/json' }
    }));

    await apiClient.deleteAccount();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/users/account'), expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-CSRF-Protection': '1'
      })
    }));
    expect(localStorage.getItem('gardens')).toBeNull();
  });

  it('keeps local session context available when logout cannot reach the server', async () => {
    localStorage.setItem('user', JSON.stringify({ username: 'Demo User' }));
    localStorage.setItem('gardens', JSON.stringify([{ id: 1 }]));
    fetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiClient.logout()).rejects.toMatchObject({
      code: API_ERROR_CODES.NETWORK_ERROR
    });

    expect(localStorage.getItem('user')).not.toBeNull();
    expect(localStorage.getItem('gardens')).not.toBeNull();
  });
});
