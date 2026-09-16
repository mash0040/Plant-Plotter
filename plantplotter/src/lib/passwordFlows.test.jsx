import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthForm from '@/components/Login/AuthForm';
import ResetPasswordPage from '@/app/reset-password/page';
import { PASSWORD_RULES_HINT } from './passwordValidation';

const mocks = vi.hoisted(() => ({
  login: vi.fn(), register: vi.fn(), resetPassword: vi.fn(), push: vi.fn(), clearError: vi.fn()
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams('token=test-reset-token')
}));
vi.mock('@/hooks/useAuth', () => ({
  SESSION_EXPIRED_FLAG: 'test-session-expired',
  useAuth: () => ({ ...mocks, loading: false })
}));
vi.mock('@/lib/api', () => ({ default: { resetPassword: mocks.resetPassword } }));

beforeEach(() => vi.clearAllMocks());

it('keeps existing over-limit passwords available for sign in', async () => {
  const password = 'Aa1' + 'x'.repeat(70);
  render(<AuthForm />);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'gardener@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('gardener@example.com', password));
});

const flows = [
  { name: 'registration', component: <AuthForm initialMode="register" />, passwordLabel: 'Password',
    confirmLabel: 'Confirm password', submitLabel: 'Create Account', call: mocks.register },
  { name: 'reset', component: <ResetPasswordPage />, passwordLabel: 'New password',
    confirmLabel: 'Confirm new password', submitLabel: 'Reset Password', call: mocks.resetPassword }
];

function fillForm(flow, password) {
  if (flow.name === 'registration') {
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Gardener' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'gardener@example.com' } });
  }
  fireEvent.change(screen.getByLabelText(flow.passwordLabel), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(flow.confirmLabel), { target: { value: password } });
}

for (const flow of flows) {
  describe(flow.name, () => {
    it.each([
      ['ASCII', 'Aa1' + 'x'.repeat(69)],
      ['multibyte', 'Aa1x' + '\ud83c\udf31'.repeat(17)]
    ])('submits the complete 72-byte %s password', async (_label, password) => {
      render(flow.component);
      expect(screen.getByLabelText(flow.passwordLabel)).toHaveAccessibleDescription(PASSWORD_RULES_HINT);
      fillForm(flow, password);
      fireEvent.click(screen.getByRole('button', { name: flow.submitLabel }));
      await waitFor(() => expect(flow.call).toHaveBeenCalledTimes(1));
      expect(flow.call).toHaveBeenCalledWith(
        ...(flow.name === 'registration'
          ? ['Gardener', 'gardener@example.com', password]
          : ['test-reset-token', password, password])
      );
    });

    it.each([
      ['ASCII', 'Aa1' + 'x'.repeat(70)],
      ['accented', 'Aa1' + '\u00e9'.repeat(35)],
      ['emoji', 'Aa1xx' + '\ud83c\udf31'.repeat(17)]
    ])('rejects over-limit %s without clipping the draft and allows correction', async (_label, password) => {
      render(flow.component);
      fillForm(flow, password);
      fireEvent.click(screen.getByRole('button', { name: flow.submitLabel }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Password is too long. Try a shorter password.');
      expect(flow.call).not.toHaveBeenCalled();
      expect(screen.getByLabelText(flow.passwordLabel)).toHaveValue(password);
      expect(screen.getByLabelText(flow.passwordLabel)).not.toHaveAttribute('maxlength');
      expect(screen.getByLabelText(flow.confirmLabel)).toHaveValue(password);
      expect(screen.getByRole('button', { name: flow.submitLabel })).toBeEnabled();
      fillForm(flow, 'ValidPass123');
      fireEvent.click(screen.getByRole('button', { name: flow.submitLabel }));
      await waitFor(() => expect(flow.call).toHaveBeenCalledTimes(1));
    });
  });
}
