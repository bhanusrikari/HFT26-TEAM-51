import React, { useState } from 'react';
import { Code2 } from 'lucide-react';

export function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    setError('');
    onLogin(name.trim(), email.trim());
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#FAF6F0' }}
    >
      {/* Logo + brand */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl shadow-md"
          style={{ background: 'linear-gradient(135deg, #6B1A2A 0%, #8B2A3C 100%)' }}
        >
          <Code2 className="w-8 h-8 text-white" />
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: '#1C0A0D', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}
        >
          RepoLens
        </h1>
        <p className="text-sm tracking-wide" style={{ color: '#6B4C52' }}>
          Evidence-based code exploration
        </p>
      </div>

      {/* Login card */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-lg border p-8 space-y-5"
        style={{ background: '#FEFCFA', borderColor: '#E4D5C4' }}
      >
        <h2
          className="text-lg font-semibold text-center"
          style={{ color: '#1C0A0D' }}
        >
          Sign in to continue
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label
              htmlFor="rl-name"
              className="block text-xs font-medium"
              style={{ color: '#6B4C52' }}
            >
              Your name
            </label>
            <input
              id="rl-name"
              type="text"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all"
              style={{
                background: '#FEFCFA',
                border: name ? '1.5px solid #6B1A2A' : '1.5px solid #E4D5C4',
                color: '#1C0A0D',
              }}
              onFocus={(e) => (e.target.style.border = '1.5px solid #6B1A2A')}
              onBlur={(e) =>
                (e.target.style.border = name ? '1.5px solid #6B1A2A' : '1.5px solid #E4D5C4')
              }
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="rl-email"
              className="block text-xs font-medium"
              style={{ color: '#6B4C52' }}
            >
              Email address
            </label>
            <input
              id="rl-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all"
              style={{
                background: '#FEFCFA',
                border: email ? '1.5px solid #6B1A2A' : '1.5px solid #E4D5C4',
                color: '#1C0A0D',
              }}
              onFocus={(e) => (e.target.style.border = '1.5px solid #6B1A2A')}
              onBlur={(e) =>
                (e.target.style.border = email ? '1.5px solid #6B1A2A' : '1.5px solid #E4D5C4')
              }
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-medium" style={{ color: '#C0392B' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all active:scale-[0.98]"
            style={{ background: '#6B1A2A', color: '#FAF6F0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4A0E1C')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6B1A2A')}
          >
            Continue
          </button>

          {/* Fine print */}
          <p className="text-center text-[11px]" style={{ color: '#9B7A82' }}>
            No password needed — sessions are stored locally.
          </p>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs" style={{ color: '#9B7A82' }}>
        Team CodeRed &bull; Hackathon 2026
      </p>
    </div>
  );
}

export default LoginPage;

