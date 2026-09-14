import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_BYTES, PASSWORD_RULES_HINT, validateNewPassword } from './passwordValidation';

const require = createRequire(import.meta.url);
const { MAX_BYTES, validatePassword } = require('../../../plantplotter_backend/utils/passwordValidation');

describe('new password policy', () => {
  it('documents the same 72-byte maximum in both workspaces', () => {
    expect(PASSWORD_MAX_BYTES).toBe(72);
    expect(PASSWORD_MAX_BYTES).toBe(MAX_BYTES);
    expect(PASSWORD_RULES_HINT).toContain('Maximum 72 UTF-8 bytes');
  });

  it.each([
    ['ASCII below boundary', 'Aa1' + 'x'.repeat(68), true],
    ['ASCII at boundary', 'Aa1' + 'x'.repeat(69), true],
    ['ASCII above boundary', 'Aa1' + 'x'.repeat(70), false],
    ['same 72-byte prefix, different suffix', 'Aa1' + 'x'.repeat(69) + 'y', false],
    ['accented below boundary', 'Aa1' + '\u00e9'.repeat(34), true],
    ['accented at boundary', 'Aa1x' + '\u00e9'.repeat(34), true],
    ['accented above boundary', 'Aa1' + '\u00e9'.repeat(35), false],
    ['emoji below boundary', 'Aa1' + '\ud83c\udf31'.repeat(17), true],
    ['emoji at boundary', 'Aa1x' + '\ud83c\udf31'.repeat(17), true],
    ['emoji above boundary', 'Aa1xx' + '\ud83c\udf31'.repeat(17), false],
    ['unpaired surrogate at boundary', 'Aa1' + '\ud800'.repeat(23), true],
    ['unpaired surrogate above boundary', 'Aa1x' + '\ud800'.repeat(23), false],
    ['minimum length', 'Aa1aaaaa', true],
    ['too short', 'Aa1aaaa', false],
    ['missing uppercase', 'password1', false],
    ['missing lowercase', 'PASSWORD1', false],
    ['missing number', 'Password', false],
    ['empty', '', false],
    ['missing', undefined, false],
    ['non-string', 12345678, false]
  ])('%s matches backend validation', (_label, password, valid) => {
    const result = validateNewPassword(password);
    expect(result).toBe(validatePassword(password));
    expect(result === null).toBe(valid);
  });
});
