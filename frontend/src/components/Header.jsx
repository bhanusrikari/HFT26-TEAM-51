import React, { useState, useEffect } from 'react';
import { checkHealth, isMockEnabled } from '../api/client';
import { MockSimulator } from './MockSimulator';
import { Code2, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

export function Header() {
  const [health, setHealth] = useState({
    status: 'checking', // 'healthy' | 'unhealthy' | 'checking'
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
        message: err.detail || 'Backend unreachable (http://localhost:8000)',
      });
    }
  };

  useEffect(() => {
    pollHealth();
    // Poll every 15s strictly adhering to the prompt requirement
    const interval = setInterval(pollHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0d1117]/95 backdrop-blur border-b border-dark-border/80 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-purple-600 text-[#0d1117] shadow">
            <Code2 className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-sans">
                RepoLens
              </h1>
              <span className="hidden xs:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-dark-subtle text-dark-muted border border-dark-border">
                Team CodeRed
              </span>
            </div>
            <p className="text-[11px] text-dark-muted hidden sm:block tracking-wide">
              Evidence-based code exploration
            </p>
          </div>
        </div>

        {/* Right side controls: Health indicator + Mock Simulator */}
        <div className="flex items-center gap-3">
          {/* Health indicator with tooltip */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-surface border border-dark-border text-xs group relative cursor-help"
            role="status"
            aria-label={`Backend health: ${health.message}`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                health.status === 'healthy'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : health.status === 'unhealthy'
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-[11px] font-mono text-dark-text hidden md:inline">
              {health.status === 'healthy' ? 'API Online' : health.status === 'unhealthy' ? 'API Offline' : 'Connecting…'}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-2.5 rounded bg-dark-subtle border border-dark-border text-[11px] font-mono text-dark-text shadow-xl">
              <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-blue" />
                <span>Backend Health Status</span>
              </div>
              <p className="text-dark-muted">{health.message}</p>
              {health.lastChecked && (
                <p className="text-[10px] text-dark-muted/70 mt-1">
                  Last checked: {health.lastChecked} (polls every 15s)
                </p>
              )}
            </div>
          </div>

          {/* Dev Mock Simulator */}
          <MockSimulator />
        </div>
      </div>
    </header>
  );
}

