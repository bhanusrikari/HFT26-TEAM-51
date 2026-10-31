import React, { useState } from 'react';
import { AlertCircle, Mail, Shield } from 'lucide-react';
import { login } from '../api/client';

export default function AuthModal({ onAuthSuccess, sessionExpiredMessage = null }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(sessionExpiredMessage || null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ email });
      onAuthSuccess(user);
    } catch (err) {
      setError(err.detail || err.message || 'Could not save your profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl border border-cream-darker bg-cream-warm p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-burg/20 bg-brand-burg/10 text-brand-burg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 id="login-title" className="text-xl font-bold text-ink">
              Sign in to RepoLens
            </h2>
            <p className="text-sm text-ink-muted">
              Your profile is saved in this browser
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-brand-burg/25 bg-brand-burg/5 p-3 text-sm text-brand-burg"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-burg" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="developer@example.com"
                className="w-full rounded-lg border border-cream-darker bg-cream px-3.5 py-2.5 pl-10 text-sm text-ink placeholder:text-ink-faint focus:border-brand-burg focus:outline-none focus:ring-2 focus:ring-brand-burg/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-burg px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-burgDark focus:outline-none focus:ring-2 focus:ring-brand-burg/40 focus:ring-offset-2 focus:ring-offset-cream-warm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                Signing in…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Continue
              </>
            )}
          </button>
        </form>

        <p className="mt-5 border-t border-cream-darker pt-4 text-xs text-ink-muted">
          This local profile is for convenience only and is not verified by a server.
        </p>
      </section>
    </div>
  );
}
