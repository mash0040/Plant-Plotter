import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRequire } from 'node:module';
import AuthForm from '@/components/Login/AuthForm';
import ProfileForm from '@/components/Profile/ProfileForm';
import { validateDisplayName, MIN_DISPLAY_NAME_LENGTH, MAX_DISPLAY_NAME_LENGTH, DISPLAY_NAME_RULES_HINT } from './displayNameValidation';

const backendPolicy = createRequire(import.meta.url)('../../../plantplotter_backend/utils/displayNameValidation.js');
const mocks = vi.hoisted(() => ({
  register: vi.fn(), updateProfile: vi.fn(), push: vi.fn(), clearError: vi.fn(),
  user: { username: 'Gardener', email: 'gardener@example.com' }
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useAuth', () => ({
  SESSION_EXPIRED_FLAG: 'test-session-expired',
  useAuth: () => ({ ...mocks, loading: false })
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue({});
  mocks.updateProfile.mockResolvedValue({});
});

const acceptedNames = [
  ['minimum', 'Al'], ['trimmed minimum', '  Al  '], ['two emoji', '\u{1F331}'.repeat(2)],
  ['below maximum', 'a'.repeat(29)], ['maximum', 'a'.repeat(30)],
  ['trimmed maximum', `  ${'a'.repeat(30)}  `], ['accented maximum', '\u00e9'.repeat(30)],
  ['emoji maximum', '\u{1F331}'.repeat(30)], ['internal whitespace', '  A  B  '],
  ['combining sequence maximum', 'e\u0301'.repeat(15)]
];
const rejectedNames = [
  ['empty', '', 'Display name is required'],
  ['whitespace only', ' \t\u00a0 ', 'Display name is required'],
  ['one character', 'A', 'Display name must be at least 2 characters'],
  ['trimmed one character', '  A  ', 'Display name must be at least 2 characters'],
  ['single emoji', '\u{1F331}', 'Display name must be at least 2 characters'],
  ['over maximum', 'a'.repeat(31), 'Display name must be 30 characters or fewer'],
  ['trimmed over maximum', `  ${'a'.repeat(31)}  `, 'Display name must be 30 characters or fewer'],
  ['emoji over maximum', '\u{1F331}'.repeat(31), 'Display name must be 30 characters or fewer'],
  ['combining sequence over maximum', 'e\u0301'.repeat(15) + 'e', 'Display name must be 30 characters or fewer']
];

it('keeps the frontend policy aligned with the backend for boundaries and Unicode', () => {
  expect(MIN_DISPLAY_NAME_LENGTH).toBe(backendPolicy.MIN_DISPLAY_NAME_LENGTH);
  expect(MAX_DISPLAY_NAME_LENGTH).toBe(backendPolicy.MAX_DISPLAY_NAME_LENGTH);
  for (const [, value] of [...acceptedNames, ...rejectedNames, ['missing', undefined], ['null', null], ['number', 123]]) {
    expect(validateDisplayName(value)).toBe(backendPolicy.validateDisplayName(value));
  }
});

for (const flow of ['registration', 'profile']) {
  describe(`${flow} display names`, () => {
    function setup(name) {
      render(flow === 'registration' ? <AuthForm initialMode="register" /> : <ProfileForm />);
      if (flow === 'registration') {
        fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'gardener@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPass123' } });
        fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'ValidPass123' } });
      }
      const input = screen.getByLabelText(/^Display name$/i);
      expect(input).toBeRequired();
      expect(input).toHaveAccessibleDescription(DISPLAY_NAME_RULES_HINT);
      expect(input).not.toHaveAttribute('maxlength');
      fireEvent.change(input, { target: { value: name } });
      return input;
    }
    const call = flow === 'registration' ? mocks.register : mocks.updateProfile;
    function submit(input) { fireEvent.submit(input.closest('form')); }
    function expectedArgs(name) {
      return flow === 'registration' ? [name, 'gardener@example.com', 'ValidPass123'] : [{ username: name }];
    }

    it.each(acceptedNames)('submits %s after trimming', async (_label, name) => {
      const input = setup(name);
      submit(input);
      await waitFor(() => expect(call).toHaveBeenCalledExactlyOnceWith(...expectedArgs(name.trim())));
    });

    it.each(rejectedNames)('rejects %s, retains the draft, and allows correction', async (_label, name, message) => {
      const input = setup(name);
      submit(input);
      expect(call).not.toHaveBeenCalled();
      expect(input).toHaveValue(name);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(`${DISPLAY_NAME_RULES_HINT} ${message}`);
      expect(screen.getByText(message)).toHaveAttribute('role', 'alert');
      fireEvent.change(input, { target: { value: '  Al  ' } });
      expect(input).toHaveAttribute('aria-invalid', 'false');
      submit(input);
      await waitFor(() => expect(call).toHaveBeenCalledExactlyOnceWith(...expectedArgs('Al')));
    });
  });
}
