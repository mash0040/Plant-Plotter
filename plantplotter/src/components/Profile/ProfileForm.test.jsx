import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/useAuth';
import ProfileForm from './ProfileForm';

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
let auth;
beforeEach(() => {
  auth = {
    user: { username: 'Gardener', email: 'gardener@example.com', isProtectedDemo: false },
    updateProfile: vi.fn().mockResolvedValue({}), deleteAccount: vi.fn().mockResolvedValue({}), loading: false
  };
  useAuth.mockImplementation(() => auth);
});

describe('protected demo profile', () => {
  it('uses the server flag to show a read-only profile without save or delete actions', async () => {
    auth.user.isProtectedDemo = true;
    const user = userEvent.setup();
    render(<ProfileForm />);
    expect(screen.getByText(/This shared demo account/)).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: 'Display Name' });
    const email = screen.getByRole('textbox', { name: 'Email Address' });
    expect(name).toHaveAttribute('readonly');
    expect(email).toHaveAttribute('readonly');
    expect(name).toHaveAccessibleDescription(/shared demo account/);
    await user.type(name, 'Changed');
    await user.type(email, 'changed@example.com');
    expect(name).toHaveValue('Gardener');
    expect(email).toHaveValue('gardener@example.com');
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
    expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete account/i })).not.toBeInTheDocument();
    fireEvent.submit(name.closest('form'));
    expect(auth.updateProfile).not.toHaveBeenCalled();
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });

  it('does not infer protection from the displayed email', () => {
    auth.user.email = 'demo@plantplotter.com';
    render(<ProfileForm />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeEnabled();
    expect(screen.getByLabelText('Email Address')).not.toHaveAttribute('readonly');
  });

  it('removes an open deletion confirmation if the server profile becomes protected', async () => {
    const user = userEvent.setup();
    const page = render(<ProfileForm />);
    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    auth = { ...auth, user: { ...auth.user, isProtectedDemo: true } };
    page.rerender(<ProfileForm />);
    expect(screen.queryByLabelText(/Type DELETE/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Permanently Delete Account' })).not.toBeInTheDocument();
  });

  it('does not expose account actions while the profile is loading', () => {
    auth.loading = true;
    auth.user = null;
    render(<ProfileForm />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('normal profile', () => {
  it('retains validation and saves corrected profile changes', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);
    const name = screen.getByLabelText('Display Name');
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText('Display name is required')).toBeInTheDocument();
    expect(auth.updateProfile).not.toHaveBeenCalled();
    await user.type(name, 'Updated Gardener');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ username: 'Updated Gardener' })));
    expect(screen.getByText('Profile updated.')).toBeInTheDocument();
  });

  it('keeps the draft and permits retry after a profile API error', async () => {
    auth.updateProfile.mockRejectedValueOnce(new Error('Service temporarily unavailable.')).mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ProfileForm />);
    const name = screen.getByLabelText('Display Name');
    await user.clear(name);
    await user.type(name, 'Updated Gardener');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service temporarily unavailable.');
    expect(name).toHaveValue('Updated Gardener');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(auth.updateProfile).toHaveBeenCalledTimes(2);
  });

  it('retains cancellation, typed confirmation, and deletion error recovery', async () => {
    auth.deleteAccount.mockRejectedValueOnce(new Error('Please try again.')).mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ProfileForm />);
    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(auth.deleteAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    expect(screen.getByRole('button', { name: 'Permanently Delete Account' })).toBeDisabled();
    await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Permanently Delete Account' }));
    expect(await screen.findByText('Please try again.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Permanently Delete Account' }));
    expect(auth.deleteAccount).toHaveBeenCalledTimes(2);
  });
});
