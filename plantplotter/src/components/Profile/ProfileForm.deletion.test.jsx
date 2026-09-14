import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import ProfileForm from './ProfileForm';

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: name => name.toLowerCase() === 'content-type' ? 'application/json' : null },
  json: async () => body
});

function SessionState() {
  const { user, loading } = useAuth();
  return <output data-testid="session-state">{loading ? 'loading' : user?.email || 'signed out'}</output>;
}

beforeEach(() => {
  router.replace.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(200, {
    id: 12, username: 'Gardener', email: 'gardener@example.com', isProtectedDemo: false
  })));
});

it.each([
  [403, 'Current password is incorrect. Check it and try again.', 'INVALID_PASSWORD'],
  [503, 'Service temporarily unavailable. Please try again shortly.', 'SERVICE_UNAVAILABLE']
])('keeps confirmation mounted through a pending request, %s failure, and explicit retry', async (status, message, code) => {
  let finishDelete;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finishDelete = resolve; }));
  const user = userEvent.setup();
  render(<AuthProvider><SessionState /><ProfileForm /></AuthProvider>);
  await user.click(await screen.findByRole('button', { name: 'Delete Account' }));
  localStorage.setItem('gardens', JSON.stringify([{ id: 2 }]));
  const password = screen.getByLabelText('Current password');
  const confirmation = screen.getByLabelText(/Type DELETE/);
  await user.type(password, 'WrongPass123');
  await user.type(confirmation, 'DELETE');
  const submit = screen.getByRole('button', { name: 'Permanently Delete Account' });
  // Multiple events in one batch also exercise the synchronous duplicate guard.
  act(() => {
    fireEvent.click(submit);
    fireEvent.click(submit);
  });
  expect(fetch).toHaveBeenCalledTimes(2); // Profile read plus one deletion.
  expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByLabelText('Current password')).toBe(password);
  expect(password).toBeDisabled();
  expect(confirmation).toBeDisabled();
  expect(screen.getByTestId('session-state')).toHaveTextContent('gardener@example.com');
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => { finishDelete(response(status, { message, code })); });
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(screen.getByLabelText('Current password')).toBe(password);
  expect(password).toHaveValue('WrongPass123');
  expect(confirmation).toHaveValue('DELETE');
  expect(submit).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(localStorage.getItem('gardens')).not.toBeNull();
  expect(screen.getByTestId('session-state')).toHaveTextContent('gardener@example.com');
  expect(fetch).toHaveBeenCalledTimes(2);

  await user.clear(password);
  await user.type(password, '  CorrectPass123  ');
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  fetch.mockResolvedValueOnce(response(200, { message: 'Account deleted successfully' }));
  await user.click(submit);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/users/account'), expect.objectContaining({
    method: 'DELETE', credentials: 'include', body: JSON.stringify({ password: '  CorrectPass123  ' })
  }));
  expect(localStorage.getItem('gardens')).toBeNull();
  expect(screen.getByTestId('session-state')).toHaveTextContent('signed out');
  expect(password).toHaveValue('');
});
