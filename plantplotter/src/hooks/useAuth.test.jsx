import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, SESSION_EXPIRED_FLAG, useAuth } from './useAuth';
import AuthForm from '@/components/Login/AuthForm';

const api = vi.hoisted(() => ({ getProfile: vi.fn(), login: vi.fn(), register: vi.fn(), verifySignup: vi.fn(), clearLegacyAuthStorage: vi.fn(), clearUserSessionStorage: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: api }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const pending = { attemptId: 'test', revision: 1, email: 'gardener@example.com' };
function Consumer() {
  const auth = useAuth();
  return <><p>{auth.loading ? 'Loading' : auth.isAuthenticated ? auth.user.username : 'Anonymous'}</p>
    <button onClick={() => auth.register('Gardener', pending.email, 'ValidPass123')}>Register</button>
    <button onClick={() => auth.verifySignup(pending, '123456')}>Verify</button></>;
}
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); api.getProfile.mockRejectedValue({ status: 401 }); });

const gardener = { id: 1, username: 'Gardener', email: pending.email };
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

it('restores an existing session silently without navigating', async () => {
  api.getProfile.mockResolvedValue(gardener);
  render(<AuthProvider><Consumer /><AuthForm /></AuthProvider>);
  await screen.findByText('Gardener');
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  expect(api.login).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(SESSION_EXPIRED_FLAG)).toBeNull();
});

it('treats anonymous startup as signed out without a session-expired notice or redirect', async () => {
  render(<AuthProvider><Consumer /><AuthForm /></AuthProvider>);
  await screen.findByText('Anonymous');
  expect(screen.queryByText('Your session expired. Please sign in again.')).not.toBeInTheDocument();
  expect(router.replace).not.toHaveBeenCalled();
  expect(api.getProfile).toHaveBeenCalledWith({ suppressAuthExpired: true, signal: expect.any(AbortSignal) });
});

it('preserves session-expired notification and navigation for an established session', async () => {
  api.getProfile.mockResolvedValue(gardener);
  render(<AuthProvider><Consumer /></AuthProvider>);
  await screen.findByText('Gardener');
  act(() => window.dispatchEvent(new Event('plantplotter:auth-expired')));
  expect(screen.getByText('Anonymous')).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_EXPIRED_FLAG)).toBe('1');
  expect(router.replace).toHaveBeenCalledExactlyOnceWith('/login');
});

it.each([
  ['success', 'before'], ['failure', 'before'],
  ['success', 'after'], ['failure', 'after']
])('ignores startup %s arriving %s a new sign-in completes', async (outcome, timing) => {
  const startup = deferred();
  const login = deferred();
  // Deliberately settle despite abort, proving stale callbacks cannot mutate state.
  api.getProfile.mockReturnValueOnce(startup.promise).mockResolvedValue(gardener);
  api.login.mockReturnValueOnce(login.promise);
  render(<AuthProvider><Consumer /><AuthForm /></AuthProvider>);
  const signal = api.getProfile.mock.calls[0][0].signal;
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: pending.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPass123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(signal.aborted).toBe(true);
  const settleStartup = () => outcome === 'success'
    ? startup.resolve({ id: 2, username: 'Previous user' })
    : startup.reject({ status: 401, code: 'TOKEN_EXPIRED' });
  if (timing === 'before') {
    await act(async () => settleStartup());
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  }
  await act(async () => login.resolve({ user: gardener }));
  if (timing === 'after') await act(async () => settleStartup());
  expect(screen.getByText('Gardener')).toBeInTheDocument();
  expect(router.push).toHaveBeenCalledExactlyOnceWith('/gardens');
  expect(router.replace).not.toHaveBeenCalled();
  expect(api.clearUserSessionStorage).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(SESSION_EXPIRED_FLAG)).toBeNull();
});

it.each(['success', 'failure'])('ignores startup %s after registration and verification', async outcome => {
  const startup = deferred();
  const registration = deferred();
  api.getProfile.mockReturnValueOnce(startup.promise);
  api.register.mockReturnValueOnce(registration.promise);
  api.verifySignup.mockResolvedValue({ user: gardener });
  render(<AuthProvider><Consumer /></AuthProvider>);
  const signal = api.getProfile.mock.calls[0][0].signal;
  fireEvent.click(screen.getByText('Register'));
  expect(signal.aborted).toBe(true);
  await act(async () => registration.resolve({ pending }));
  expect(screen.getByText('Anonymous')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Verify'));
  await screen.findByText('Gardener');
  await act(async () => {
    if (outcome === 'success') startup.resolve({ id: 2, username: 'Previous user' });
    else startup.reject({ status: 401, code: 'TOKEN_EXPIRED' });
  });
  expect(screen.getByText('Gardener')).toBeInTheDocument();
  expect(router.replace).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(SESSION_EXPIRED_FLAG)).toBeNull();
});

it('cancels startup detection when restoring and verifying a pending signup', async () => {
  const startup = deferred();
  api.getProfile.mockReturnValueOnce(startup.promise);
  api.verifySignup.mockResolvedValue({ user: gardener });
  render(<AuthProvider><Consumer /></AuthProvider>);
  const signal = api.getProfile.mock.calls[0][0].signal;
  fireEvent.click(screen.getByText('Verify'));
  expect(signal.aborted).toBe(true);
  await screen.findByText('Gardener');
  await act(async () => startup.reject({ status: 401 }));
  expect(screen.getByText('Gardener')).toBeInTheDocument();
});

it('aborts the startup request when the provider unmounts', () => {
  api.getProfile.mockReturnValueOnce(new Promise(() => {}));
  const { unmount } = render(<AuthProvider><Consumer /></AuthProvider>);
  const signal = api.getProfile.mock.calls[0][0].signal;
  unmount();
  expect(signal.aborted).toBe(true);
});
it('does not load a profile or set authenticated state for pending signup, then authenticates on verification', async () => {
  api.register.mockResolvedValue({ pending });
  api.verifySignup.mockResolvedValue({ user: { id: 1, username: 'Gardener', email: pending.email } });
  render(<AuthProvider><Consumer /></AuthProvider>);
  await screen.findByText('Anonymous');
  fireEvent.click(screen.getByText('Register'));
  await waitFor(() => expect(api.register).toHaveBeenCalled());
  await screen.findByText('Anonymous');
  expect(api.getProfile).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Verify'));
  await screen.findByText('Gardener');
  expect(api.verifySignup).toHaveBeenCalledWith(pending, '123456');
});
