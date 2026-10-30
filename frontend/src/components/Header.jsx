import React, { useState, useEffect } from 'react';
import { checkHealth } from '../api/client';
import { MockSimulator } from './MockSimulator';
import { Code2, Activity, BarChart3, LogOut, User } from 'lucide-react';

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
        message: err.detail || 'Backend unreachable (http://localhost:8000)',
      });
    }
  };

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0d1117]/95 backdrop-blur border-b border-dark-border/80 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[#0d1117] shadow">
            <Code2 className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-sans">
                RepoLens
              </h1>
              <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Team CodeRed
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block tracking-wide">
              Evidence-based code exploration
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Benchmark Button */}
          {onOpenBenchmark && (
            <button
              onClick={onOpenBenchmark}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
              title="View benchmark evaluation"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline font-medium">Benchmark</span>
            </button>
          )}

          {/* Health indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs group relative cursor-help"
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
            <span className="text-[11px] font-mono text-slate-300 hidden md:inline">
              {health.status === 'healthy' ? 'API Online' : health.status === 'unhealthy' ? 'API Offline' : 'Connecting…'}
            </span>

            {/* Tooltip */}
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-2.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 shadow-xl">
              <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Backend Health Status</span>
              </div>
              <p className="text-slate-400">{health.message}</p>
              {health.lastChecked && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Last checked: {health.lastChecked} (polls every 15s)
                </p>
              )}
            </div>
          </div>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[140px]">{user.email}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/30 border border-slate-700 text-xs text-slate-300 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
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
