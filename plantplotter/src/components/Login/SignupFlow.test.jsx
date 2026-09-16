import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SignupFlow from './SignupFlow';

const mocks = vi.hoisted(() => ({ getPendingSignup: vi.fn(), resendSignup: vi.fn(), changeSignupEmail: vi.fn(),
  verifySignup: vi.fn(), register: vi.fn(), push: vi.fn(), clearError: vi.fn(), authLoading: false }));
vi.mock('@/lib/api', () => ({ default: mocks }));
vi.mock('@/hooks/useAuth', () => ({ SESSION_EXPIRED_FLAG: 'test-session', useAuth: () => ({ ...mocks, loading: mocks.authLoading }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
const pending = { attemptId: 'attempt-one', revision: 1, email: 'gardener@example.com', delivery: 'sent', resendAfter: 0, exhausted: false };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authLoading = false;
  mocks.getPendingSignup.mockResolvedValue({ pending });
  mocks.resendSignup.mockResolvedValue({ pending: { ...pending, revision: 2, resendAfter: 60 } });
  mocks.verifySignup.mockResolvedValue({ user: { id: 1 } });
});
afterEach(() => { vi.useRealTimers(); });
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submitCode = () => fireEvent.submit(screen.getByLabelText('Verification code').closest('form'));
async function open() { render(<SignupFlow />); await screen.findByRole('heading', { name: 'Verify your email' }); }

it('restores pending signup, supports paste/autofill and signs in only after verification', async () => {
  await open();
  const code = screen.getByLabelText('Verification code');
  await waitFor(() => expect(code).toHaveFocus()); expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  expect(code).toHaveAttribute('inputmode', 'numeric'); expect(code).toHaveAttribute('type', 'text');
  expect(mocks.push).not.toHaveBeenCalled();
  change('Verification code', '012345'); submitCode();
  await waitFor(() => expect(mocks.verifySignup).toHaveBeenCalledWith(pending, '012345'));
  expect(mocks.push).toHaveBeenCalledWith('/gardens');
});

it('moves from account details to pending verification without navigating or retaining password inputs', async () => {
  mocks.getPendingSignup.mockResolvedValue({ pending: null }); mocks.register.mockResolvedValue({ pending });
  render(<SignupFlow />); await screen.findByLabelText('Display name');
  for (const [label, value] of [['Display name', 'Gardener'], ['Email address', pending.email], ['Password', 'ValidPass123'], ['Confirm password', 'ValidPass123']]) change(label, value);
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  await screen.findByRole('heading', { name: 'Verify your email' });
  expect(mocks.push).not.toHaveBeenCalled(); expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  expect(localStorage.getItem('password')).toBeNull(); expect(sessionStorage.getItem('password')).toBeNull();
});

it('keeps invalid codes inline and preserves the submitted value for an explicit retry', async () => {
  await open();
  change('Verification code', '123'); submitCode();
  expect(mocks.verifySignup).not.toHaveBeenCalled(); expect(screen.getByLabelText('Verification code')).toHaveAttribute('aria-invalid', 'true');
  mocks.verifySignup.mockRejectedValueOnce(Object.assign(new Error('This code has expired. Request a new code.'), { status: 400, code: 'CODE_EXPIRED' }));
  change('Verification code', '123456'); submitCode();
  await screen.findByText('This code has expired. Request a new code.');
  expect(screen.getByLabelText('Verification code')).toHaveValue('123456');
  expect(screen.getByLabelText('Verification code')).toHaveAccessibleDescription('This code has expired. Request a new code.');
  expect(mocks.push).not.toHaveBeenCalled();
});

it('disables exhausted codes and replaces the code and revision after resend', async () => {
  mocks.verifySignup.mockRejectedValueOnce(Object.assign(new Error('Too many incorrect codes. Request a new code.'), { status: 400, code: 'CODE_EXHAUSTED' }));
  await open(); change('Verification code', '123456'); submitCode();
  await screen.findByText('Too many incorrect codes. Request a new code.');
  expect(screen.getByRole('button', { name: 'Verify email' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
  await screen.findByText('A new code has been sent. Use the code in your latest email.');
  expect(screen.getByLabelText('Verification code')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled();
  change('Verification code', '654321'); submitCode();
  await waitFor(() => expect(mocks.verifySignup).toHaveBeenLastCalledWith(expect.objectContaining({ revision: 2 }), '654321'));
});

it('restores the server cooldown on refresh and enables resend when it elapses', async () => {
  vi.useFakeTimers();
  mocks.getPendingSignup.mockResolvedValue({ pending: { ...pending, resendAfter: 2 } });
  await act(async () => { render(<SignupFlow />); });
  expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled();
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
});

it('changes only the pending address, shows validation beside Email and allows retry', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
  await waitFor(() => expect(screen.getByLabelText('Email address')).toHaveFocus());
  change('Email address', 'mistyped@'); fireEvent.click(screen.getByRole('button', { name: 'Send code to this email' }));
  expect(mocks.changeSignupEmail).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
  mocks.changeSignupEmail.mockRejectedValueOnce(Object.assign(new Error('Email already registered'), { code: 'EMAIL_ALREADY_REGISTERED' }));
  change('Email address', 'existing@example.com'); fireEvent.click(screen.getByRole('button', { name: 'Send code to this email' }));
  await screen.findByText('Email already registered');
  expect(screen.getByLabelText('Email address')).toHaveValue('existing@example.com');
  mocks.changeSignupEmail.mockResolvedValueOnce({ pending: { ...pending, email: 'correct@example.com', revision: 2 } });
  change('Email address', 'correct@example.com'); fireEvent.click(screen.getByRole('button', { name: 'Send code to this email' }));
  await screen.findByText('correct@example.com');
  expect(mocks.changeSignupEmail).toHaveBeenLastCalledWith(pending, 'correct@example.com');
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
});

it('reports failed delivery accurately and recovers with explicit resend', async () => {
  mocks.getPendingSignup.mockResolvedValue({ pending: { ...pending, delivery: 'failed' } });
  await open();
  expect(screen.getByRole('alert')).toHaveTextContent('We could not send your code');
  expect(screen.getByRole('button', { name: 'Verify email' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
  await screen.findByText('A new code has been sent. Use the code in your latest email.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps a code after network failure and prevents duplicate in-flight submissions', async () => {
  let reject;
  mocks.verifySignup.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  await open(); change('Verification code', '123456'); submitCode(); submitCode();
  expect(mocks.verifySignup).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Verification code')).toBeDisabled();
  await act(async () => reject(new Error('Check your connection and try again.')));
  expect(screen.getByLabelText('Verification code')).toHaveValue('123456');
  expect(screen.getByRole('alert')).toHaveTextContent('Check your connection');
  submitCode(); await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gardens'));
});

it('reloads stale attempt metadata and offers sign-in after a consumed response', async () => {
  mocks.verifySignup.mockRejectedValueOnce(Object.assign(new Error('Signup changed'), { code: 'SIGNUP_CHANGED' }));
  await open();
  mocks.getPendingSignup.mockResolvedValueOnce({ pending: { ...pending, revision: 2, email: 'new@example.com' } });
  change('Verification code', '123456'); submitCode();
  await screen.findByText('new@example.com');
  mocks.verifySignup.mockRejectedValueOnce(Object.assign(new Error('Already used'), { code: 'CODE_CONSUMED' }));
  change('Verification code', '654321'); submitCode();
  await screen.findByText('Your account has been created. Sign in to continue.');
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
});

it('makes pending-status network failures retryable without discarding the signup', async () => {
  mocks.getPendingSignup.mockRejectedValueOnce(new Error('Check your connection.'));
  render(<SignupFlow />); await screen.findByText('Check your connection.');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Verify your email' });
});

it('waits for the initial session lookup before verification can establish a new session', async () => {
  mocks.authLoading = true;
  await open();
  expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  change('Verification code', '123456'); submitCode();
  expect(mocks.verifySignup).not.toHaveBeenCalled();
});
