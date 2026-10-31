```jsx
import React, { useState, useEffect } from 'react';
import { checkHealth } from '../api/client';
import { MockSimulator } from './MockSimulator';
import {
  Code2,
  Activity,
  BarChart3,
  LogOut,
  User,
} from 'lucide-react';

export function Header({ user, onLogout, onOpenBenchmark }) {
  const [health, setHealth] = useState({
    status: 'checking',
    lastChecked: null,
    message: 'Checking backend status…',
  });

  const pollHealth = async () => {
    try {
      await checkHealth();
      setHealth({
        status: 'healthy',
        lastChecked: new Date().toLocaleTimeString(),
        message: 'Backend healthy (HTTP 200 OK)',
      });
    } catch (err) {
      setHealth({
        status: 'unhealthy',
        lastChecked: new Date().toLocaleTimeString(),
        message:
          err.detail || 'Backend unreachable (http://localhost:8000)',
      });
    }
  };

  useEffect(() => {
    pollHealth();

    const interval = setInterval(pollHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-cream-warm/95 backdrop-blur border-b border-cream-darker px-4 sm:px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-burg to-brand-burgLight shadow-md transition-transform hover:scale-105 duration-200">
            <Code2 className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-ink font-sans">
                RepoLens
              </h1>

              <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cream-dark text-brand-burg border border-cream-darker shadow-2xs">
                Team CodeRed
              </span>
            </div>

            <p className="text-[11px] text-ink-muted hidden sm:block tracking-wide">
              Evidence-based code exploration
            </p>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Benchmark Button */}
          {onOpenBenchmark && (
            <button
              type="button"
              onClick={onOpenBenchmark}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cream-dark hover:bg-cream-darker border border-cream-darker text-brand-burg text-xs transition-colors"
              title="View benchmark evaluation"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">
                Benchmark
              </span>
            </button>
          )}

          {/* Backend Health Indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-cream-dark border border-cream-darker text-xs group relative cursor-help"
            role="status"
            aria-label={`Backend health: ${health.message}`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                health.status === 'healthy'
                  ? 'bg-emerald-500'
                  : health.status === 'unhealthy'
                    ? 'bg-rose-500'
                    : 'bg-amber-500 animate-pulse'
              }`}
            />

            <span className="text-[11px] font-mono text-ink-muted hidden md:inline">
              {health.status === 'healthy'
                ? 'API Online'
                : health.status === 'unhealthy'
                  ? 'API Offline'
                  : 'Connecting…'}
            </span>

            {/* Health Tooltip */}
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-2.5 rounded-lg bg-cream-warm border border-cream-darker text-[11px] font-mono text-ink shadow-xl">
              <div className="font-semibold text-brand-burg mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Backend Health Status</span>
              </div>

              <p className="text-ink-muted">{health.message}</p>

              {health.lastChecked && (
                <p className="text-[10px] text-ink-muted mt-1">
                  Last checked: {health.lastChecked} (polls every 15s)
                </p>
              )}
            </div>
          </div>

          {/* User Profile & Logout */}
          {user && (
            <div className="relative group flex items-center gap-2 pl-2 border-l border-cream-darker">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-ink-muted font-mono">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm select-none shadow-sm transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: '#6B1A2A',
                  color: '#FAF6F0',
                }}
                aria-label="Sign out"
                title={`${user.name || user.email} — Sign out`}
              >
                {user.avatarInitials || (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Dev Mock Simulator */}
          <MockSimulator />
        </div>
      </div>
    </header>
  );
}
```