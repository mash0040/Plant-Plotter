import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './useAuth';

const api = vi.hoisted(() => ({ getProfile: vi.fn(), register: vi.fn(), verifySignup: vi.fn(), clearLegacyAuthStorage: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: api }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const pending = { attemptId: 'test', revision: 1, email: 'gardener@example.com' };
function Consumer() {
  const auth = useAuth();
  return <><p>{auth.loading ? 'Loading' : auth.isAuthenticated ? auth.user.username : 'Anonymous'}</p>
    <button onClick={() => auth.register('Gardener', pending.email, 'ValidPass123')}>Register</button>
    <button onClick={() => auth.verifySignup(pending, '123456')}>Verify</button></>;
}
beforeEach(() => { vi.clearAllMocks(); api.getProfile.mockRejectedValue({ status: 401 }); });
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
