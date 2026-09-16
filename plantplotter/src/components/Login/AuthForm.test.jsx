import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PASSWORD_RULES_HINT } from '@/lib/passwordValidation';
import { EMAIL_VALIDATION_MESSAGE } from '@/lib/emailValidation';
import AuthForm from './AuthForm';

const mocks = vi.hoisted(() => ({ register: vi.fn(), login: vi.fn(), push: vi.fn(), clearError: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useAuth', () => ({
  SESSION_EXPIRED_FLAG: 'test-session-expired',
  useAuth: () => ({ ...mocks, loading: false })
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue({});
  mocks.login.mockResolvedValue({});
});

const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.submit(screen.getByLabelText('Email address').closest('form'));
function fillValidForm() {
  change('Display name', '  Gardener  ');
  change('Email address', 'gardener@example.com');
  change('Password', 'ValidPass123');
  change('Confirm password', 'ValidPass123');
}
function expectFieldError(label, message) {
  const input = screen.getByLabelText(label);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(expect.stringContaining(message));
  const error = screen.getByText(message);
  expect(error).toHaveAttribute('role', 'alert');
  expect(input.closest('form')).toContainElement(error);
  expect(input.parentElement.parentElement).toContainElement(error);
}

describe('create-account validation', () => {
  it('places concise guidance beneath its own field and before confirmation', () => {
    render(<AuthForm initialMode="register" />);
    const name = screen.getByLabelText('Display name');
    const password = screen.getByLabelText('Password');
    const confirmation = screen.getByLabelText('Confirm password');
    const helper = screen.getByText(PASSWORD_RULES_HINT);
    expect(name).toHaveAccessibleDescription('2–30 characters.');
    expect(password).toHaveAccessibleDescription(PASSWORD_RULES_HINT);
    expect(password.parentElement.parentElement).toContainElement(helper);
    expect(helper.compareDocumentPosition(confirmation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(confirmation).not.toHaveAttribute('aria-describedby');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows all missing-field errors together and focuses the first invalid input', () => {
    render(<AuthForm initialMode="register" />);
    submit();
    expectFieldError('Display name', 'Display name is required');
    expectFieldError('Email address', 'Email is required');
    expectFieldError('Password', 'Password is required');
    expectFieldError('Confirm password', 'Please confirm your password');
    expect(screen.getAllByRole('alert')).toHaveLength(4);
    expect(screen.getByLabelText('Display name')).toHaveFocus();
    expect(mocks.register).not.toHaveBeenCalled();
    change('Display name', 'Al');
    expect(screen.getByLabelText('Display name')).toHaveAttribute('aria-invalid', 'false');
    expectFieldError('Email address', 'Email is required');
    submit();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
  });

  it('shows invalid values at their fields and submits corrected values without clipping', async () => {
    render(<AuthForm initialMode="register" />);
    change('Display name', 'A');
    change('Email address', 'gardener@');
    change('Password', 'short');
    change('Confirm password', 'different');
    submit();
    expectFieldError('Display name', 'Display name must be at least 2 characters');
    expectFieldError('Email address', EMAIL_VALIDATION_MESSAGE);
    expectFieldError('Password', 'Password must be at least 8 characters long');
    expectFieldError('Confirm password', 'Passwords do not match');
    expect(mocks.register).not.toHaveBeenCalled();
    fillValidForm();
    submit();
    await waitFor(() => expect(mocks.register).toHaveBeenCalledExactlyOnceWith('Gardener', 'gardener@example.com', 'ValidPass123'));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('allows a mismatch to be corrected by changing the original password', async () => {
    render(<AuthForm initialMode="register" />);
    fillValidForm();
    change('Password', 'DifferentPass123');
    submit();
    expectFieldError('Confirm password', 'Passwords do not match');
    expect(screen.getByLabelText('Confirm password')).toHaveFocus();
    change('Password', 'ValidPass123');
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
    submit();
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['username', 'Display name', 'Choose a different display name.'],
    ['email', 'Email address', 'Check this email address.'],
    ['password', 'Password', 'Choose a different password.']
  ])('places server %s validation beneath its field and restores focus after submission', async (field, label, message) => {
    mocks.register.mockRejectedValueOnce(Object.assign(new Error(message), { status: 400, errors: { [field]: message } }));
    render(<AuthForm initialMode="register" />);
    fillValidForm();
    submit();
    await screen.findByText(message);
    expectFieldError(label, message);
    await waitFor(() => expect(screen.getByLabelText(label)).toHaveFocus());
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByLabelText('Password')).toHaveValue('ValidPass123');
  });

  it('shows duplicate-email feedback at Email and lets the user retry', async () => {
    mocks.register.mockRejectedValueOnce(Object.assign(new Error('Email already registered'), { code: 'EMAIL_ALREADY_REGISTERED' }));
    render(<AuthForm initialMode="register" />);
    fillValidForm();
    submit();
    const message = 'Email already registered. Sign in or use another email address.';
    await screen.findByText(message);
    expectFieldError('Email address', message);
    await waitFor(() => expect(screen.getByLabelText('Email address')).toHaveFocus());
    change('Email address', 'another@example.com');
    submit();
    await waitFor(() => expect(mocks.register).toHaveBeenNthCalledWith(2, 'Gardener', 'another@example.com', 'ValidPass123'));
  });

  it('keeps network failures above the form and preserves every draft field for retry', async () => {
    mocks.register.mockRejectedValueOnce(new Error('PlantPlotter could not be reached. Check your connection and try again.'));
    render(<AuthForm initialMode="register" />);
    fillValidForm();
    submit();
    const alert = await screen.findByRole('alert');
    const form = screen.getByLabelText('Email address').closest('form');
    expect(form).not.toContainElement(alert);
    expect(alert.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('Display name')).toHaveValue('  Gardener  ');
    expect(screen.getByLabelText('Email address')).toHaveValue('gardener@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('ValidPass123');
    expect(screen.getByLabelText('Confirm password')).toHaveValue('ValidPass123');
    submit();
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(2));
  });

  it('disables inputs and prevents another submission while creating the account', async () => {
    let finish;
    mocks.register.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<AuthForm initialMode="register" />);
    fillValidForm();
    submit();
    expect(screen.getByRole('button', { name: 'Sending code...' })).toBeDisabled();
    for (const label of ['Display name', 'Email address', 'Password', 'Confirm password']) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    submit();
    expect(mocks.register).toHaveBeenCalledTimes(1);
    await act(async () => finish({}));
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

it('keeps login field validation consistent without enforcing new-password rules', async () => {
  render(<AuthForm />);
  submit();
  expectFieldError('Email address', 'Email is required');
  expectFieldError('Password', 'Password is required');
  expect(screen.getByLabelText('Email address')).toHaveFocus();
  change('Email address', 'gardener@example.com');
  change('Password', 'old');
  mocks.login.mockRejectedValueOnce(new Error('Invalid credentials'));
  submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  expect(screen.getByLabelText('Email address').closest('form')).not.toContainElement(screen.getByRole('alert'));
  expect(mocks.login).toHaveBeenCalledWith('gardener@example.com', 'old');
});
