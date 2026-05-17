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
      setError(err instanceof ApiError ? err.message : 'send_failed');
    }
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await verifyCode.mutateAsync({ email: email.trim(), code: code.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'invalid_code');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background-dark text-text-primary">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <img src="/bubbles-logo.png" alt="Bubbles" className="h-20 w-20 mx-auto" />
          <h1 className="bubbles-gradient mt-4 font-display text-4xl font-bold tracking-wider uppercase">
            Bubbles
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted mt-2">
            Multi-agent content ops
          </p>
        </div>

        <div className="border border-border-color bg-surface p-6 rounded-xl">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-4">
            [AUTH] // {stage === 'email' ? 'REQUEST_CODE' : 'VERIFY_CODE'}
          </p>

          {stage === 'email' && (
            <form onSubmit={onSubmitEmail} className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted" htmlFor="email">
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
                placeholder="you@company.com"
                className="w-full bg-background-dark border border-border-color rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-colors"
              />
              <button
                type="submit"
                disabled={requestCode.isPending}
                className="btn-bracket w-full bg-primary text-white py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {requestCode.isPending ? 'SENDING' : 'SEND_CODE'}
              </button>
            </form>
          )}

          {stage === 'code' && (
            <form onSubmit={onSubmitCode} className="space-y-3">
              <p className="text-xs text-muted">
                Code sent to <span className="font-mono text-text-primary">{email}</span>.
              </p>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted" htmlFor="code">
                Six-digit code
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
                className="w-full bg-background-dark border border-border-color rounded px-3 py-2.5 text-lg tracking-[0.4em] text-center font-mono text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
              />
              <button
                type="submit"
                disabled={verifyCode.isPending || code.length !== 6}
                className="btn-bracket w-full bg-primary text-white py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {verifyCode.isPending ? 'VERIFYING' : 'AUTHENTICATE'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('email');
                  setCode('');
                  setError(null);
                }}
                className="block w-full font-mono text-[10px] uppercase tracking-wider text-muted hover:text-text-primary transition-colors"
              >
                ← use a different email
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-accent-red text-center">
              [ERROR] {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          [SYSTEM_ONLINE] // Connection secure
        </p>
      </div>
    </main>
  );
}
