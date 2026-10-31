import React from 'react';
import { MockSimulator } from './MockSimulator';
import { Code2, LogOut, User } from 'lucide-react';

export function Header({ user, onLogout }) {
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