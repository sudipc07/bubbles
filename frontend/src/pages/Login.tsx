import { useState, type FormEvent } from 'react';
import { ApiError } from '../lib/api';
import { useRequestCode, useVerifyCode } from '../lib/auth';

type Stage = 'email' | 'code';

export function LoginPage() {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const requestCode = useRequestCode();
  const verifyCode = useVerifyCode();

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await requestCode.mutateAsync(email.trim());
      setStage('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code');
    }
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await verifyCode.mutateAsync({ email: email.trim(), code: code.trim() });
      // Auth state updates automatically; App re-renders.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Bubbles</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in with email</p>
        </div>

        {stage === 'email' && (
          <form onSubmit={onSubmitEmail} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <button
              type="submit"
              disabled={requestCode.isPending}
              className="w-full rounded-md bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {requestCode.isPending ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {stage === 'code' && (
          <form onSubmit={onSubmitCode} className="space-y-3">
            <p className="text-sm text-neutral-600">
              Sent a 6-digit code to <span className="font-medium">{email}</span>.
            </p>
            <label className="block text-sm font-medium" htmlFor="code">
              Code
            </label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-[0.4em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <button
              type="submit"
              disabled={verifyCode.isPending || code.length !== 6}
              className="w-full rounded-md bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {verifyCode.isPending ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage('email');
                setCode('');
                setError(null);
              }}
              className="w-full text-xs text-neutral-500 hover:text-neutral-700"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      </div>
    </main>
  );
}
