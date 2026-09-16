'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/lib/emailValidation';
import { getActionErrorMessage } from '@/lib/apiErrors';
import AuthForm from './AuthForm';

const inputClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100';
const buttonClass = 'w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-60 disabled:cursor-not-allowed';

export default function SignupFlow() {
  const router = useRouter();
  const { verifySignup, loading: authLoading } = useAuth();
  const [pending, setPending] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const codeRef = useRef(null);
  const emailRef = useRef(null);
  const submitting = useRef(false);

  function acceptPending(next) {
    setPending(next);
    setEmail(next?.email || '');
    setCode('');
    setChangingEmail(false);
    setFieldError('');
    setError('');
    setNotice('');
    const delay = next?.resendAfter || 0;
    setRetryAt(Date.now() + delay * 1000);
    setSeconds(delay);
  }
  async function restore() {
    setChecking(true);
    setCheckError('');
    try {
      const result = await apiClient.getPendingSignup();
      acceptPending(result.pending);
      setCompleted(Boolean(result.completed));
    } catch (err) {
      setCheckError(getActionErrorMessage(err, 'Your signup could not be loaded.'));
    } finally { setChecking(false); }
  }
  useEffect(() => {
    let active = true;
    apiClient.getPendingSignup().then(result => {
      if (!active) return;
      acceptPending(result.pending);
      setCompleted(Boolean(result.completed));
    }).catch(err => {
      if (active) setCheckError(getActionErrorMessage(err, 'Your signup could not be loaded.'));
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => {
    if (!checking && pending && !busy) (changingEmail ? emailRef : codeRef).current?.focus();
  }, [checking, pending, changingEmail, busy]);

  async function perform(action) {
    if (submitting.current || (action === 'verify' && authLoading)) return;
    setError('');
    setFieldError('');
    setNotice('');
    if (action === 'verify' && !/^\d{6}$/.test(code)) {
      setFieldError('Enter the six-digit code from your email.');
      codeRef.current?.focus();
      return;
    }
    if (action === 'change') {
      const invalid = validateEmail(email.trim());
      if (invalid) { setFieldError(invalid); emailRef.current?.focus(); return; }
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (action === 'verify') {
        await verifySignup(pending, code);
        router.push('/gardens');
      } else {
        const result = action === 'change'
          ? await apiClient.changeSignupEmail(pending, email.trim())
          : await apiClient.resendSignup(pending);
        acceptPending(result.pending);
        setChangingEmail(false);
        if (result.pending.delivery === 'sent') setNotice('A new code has been sent. Use the code in your latest email.');
      }
    } catch (err) {
      if (err.retryAfter) {
        const delay = Number(err.retryAfter);
        setRetryAt(Date.now() + delay * 1000);
        setSeconds(delay);
      }
      if (err.code === 'SIGNUP_CHANGED') {
        await restore();
        setChangingEmail(false);
        setNotice('Your signup details changed. Continue with the latest email and code.');
      } else if (err.code === 'SIGNUP_EXPIRED') {
        setPending(null);
        setNotice(err.message);
      } else if (err.code === 'CODE_CONSUMED') {
        setCompleted(true);
      } else if (action === 'verify' && err.status === 400) {
        setFieldError(err.message);
        if (err.code === 'CODE_EXHAUSTED') setPending(current => ({ ...current, exhausted: true }));
      } else if (action === 'change' && (err.errors?.email || err.code === 'EMAIL_ALREADY_REGISTERED')) {
        setFieldError(err.errors?.email || err.message);
      } else {
        setError(getActionErrorMessage(err, action === 'verify' ? 'Email verification could not be completed.' : 'Your code could not be sent.'));
      }
    } finally { submitting.current = false; setBusy(false); }
  }

  if (checking) return <p role="status" className="text-gray-700">Checking your signup...</p>;
  if (checkError) return <div className="space-y-4"><p role="alert" className="text-red-700">{checkError}</p><button className={buttonClass} onClick={restore}>Try again</button></div>;
  if (completed) return <div className="space-y-4"><p role="status">Your account has been created. Sign in to continue.</p><Link className="font-semibold text-green-700 underline" href="/login">Sign in</Link></div>;
  if (!pending) return <>{notice && <p role="status" className="mb-4 text-gray-700">{notice}</p>}<AuthForm initialMode="register" onPending={acceptPending} /></>;

  return <section className="space-y-5" aria-labelledby="verify-heading">
    <div>
      <h2 id="verify-heading" className="text-xl font-semibold text-gray-900">Verify your email</h2>
      <p className="mt-2 text-gray-700">Enter the code for <strong className="break-all">{pending.email}</strong>.</p>
      <p className="mt-2 text-sm text-gray-600">Codes expire after 10 minutes. Check your spam folder if the email has not arrived.</p>
    </div>
    {pending.delivery !== 'sent' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">
      {pending.delivery === 'failed' ? 'We could not send your code. Use Resend code to try again.' : 'We could not confirm that your code was sent. Wait a moment, then reload or resend it.'}
    </p>}
    {notice && <p role="status" className="text-green-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {changingEmail ? <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); perform('change'); }}>
      <div><label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-gray-700">Email address</label>
        <input ref={emailRef} id="signup-email" name="email" type="email" autoComplete="email" value={email} disabled={busy}
          className={inputClass} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'signup-field-error' : undefined}
          onChange={event => { setEmail(event.target.value); setFieldError(''); setError(''); }} />
        {fieldError && <p id="signup-field-error" role="alert" className="mt-2 text-sm text-red-700">{fieldError}</p>}
      </div>
      <button className={buttonClass} disabled={busy || seconds > 0}>{busy ? 'Sending code...' : 'Send code to this email'}</button>
      <button type="button" className="min-h-11 font-medium text-green-700 underline" disabled={busy} onClick={() => { setChangingEmail(false); setFieldError(''); setError(''); }}>Cancel</button>
    </form> : <>
      <form noValidate className="space-y-4" onSubmit={event => { event.preventDefault(); perform('verify'); }}>
        <div><label htmlFor="signup-code" className="mb-2 block text-sm font-medium text-gray-700">Verification code</label>
          <input ref={codeRef} id="signup-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy} className={`${inputClass} text-xl tabular-nums`}
            aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'signup-field-error' : undefined}
            onChange={event => { setCode(event.target.value.replace(/\s/g, '')); setFieldError(''); }} />
          {fieldError && <p id="signup-field-error" role="alert" className="mt-2 text-sm text-red-700">{fieldError}</p>}
        </div>
        {pending.exhausted && !fieldError && <p role="alert" className="text-sm text-red-700">Too many incorrect codes. Request a new code.</p>}
        <button className={buttonClass} disabled={busy || authLoading || pending.exhausted || pending.delivery !== 'sent'}>{busy || authLoading ? 'Please wait...' : 'Verify email'}</button>
      </form>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className="min-h-11 font-medium text-green-700 underline disabled:text-gray-500 disabled:no-underline" disabled={busy || seconds > 0} onClick={() => perform('resend')}>Resend code</button>
        <button type="button" className="min-h-11 font-medium text-green-700 underline" disabled={busy} onClick={() => { setChangingEmail(true); setFieldError(''); setError(''); }}>Change email</button>
      </div>
    </>}
    {seconds > 0 && <p className="text-sm text-gray-600">You can request another code in {seconds}s.</p>}
    <p className="text-sm text-gray-600">Already verified? <Link href="/login" className="font-medium text-green-700 underline">Sign in</Link></p>
  </section>;
}
