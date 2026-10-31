import React, { useState } from 'react';
import {
  isMockEnabled,
  setSimulatedError,
  getSimulatedError,
} from '../api/client';
import { Bug, Check } from 'lucide-react';

export function MockSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentError, setCurrentError] = useState(getSimulatedError());

  // Show simulation controls only when mock mode is enabled
  if (!isMockEnabled()) {
    return null;
  }

  const handleErrorChange = (mode) => {
    setCurrentError(mode);
    setSimulatedError(mode);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-all ${
          currentError !== 'none'
            ? 'bg-brand-burg/10 border-brand-burg/30 text-brand-burg animate-pulse'
            : 'bg-brand-burg/10 border-brand-burg/30 text-brand-burg hover:bg-brand-burg/15'
        }`}
        title="Mock Error Simulation Controls"
        aria-expanded={isOpen}
      >
        <Bug className="w-3.5 h-3.5" />
        <span>Mock Simulation</span>

        {currentError !== 'none' && (
          <span className="w-2 h-2 rounded-full bg-brand-burg" />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-cream-warm border border-cream-darker shadow-2xl p-4 z-50 text-xs space-y-3 font-sans text-ink">
            <div className="flex items-center justify-between border-b border-cream-darker pb-2">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-brand-burg" />
                <span>Simulation Controls</span>
              </span>

              <span className="text-[10px] font-mono text-ink-muted bg-cream px-1.5 py-0.5 rounded border border-cream-darker">
                Mock ON
              </span>
            </div>

            {/* Simulated Error States */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-ink-muted block">
                Simulate Backend Edge Cases:
              </span>

              {[
                {
                  id: 'none',
                  label: 'Normal (Clean 200 OK)',
                  color: 'text-brand-burg',
                },
                {
                  id: 'empty',
                  label: 'Empty results (0 matches)',
                  color: 'text-ink',
                },
                {
                  id: 'explanation_error',
                  label: 'Explanation Error (LLM quota)',
                  color: 'text-brand-burg',
                },
                {
                  id: '404',
                  label: '404 Not Found (Missing Repo)',
                  color: 'text-brand-burg',
                },
                {
                  id: '502',
                  label: '502 Bad Gateway (Upstream Fail)',
                  color: 'text-brand-burg',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleErrorChange(item.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-mono text-xs transition-colors ${
                    currentError === item.id
                      ? 'bg-cream-dark text-ink font-bold border border-cream-darker shadow-xs'
                      : 'text-ink-muted hover:bg-cream hover:text-ink'
                  }`}
                >
                  <span className={item.color}>{item.label}</span>

                  {currentError === item.id && (
                    <Check className="w-3.5 h-3.5 text-brand-burg shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-cream-darker text-[11px] text-ink-muted leading-tight">
              To connect to the real backend, set{' '}
              <code className="text-brand-burg font-semibold">
                VITE_USE_MOCK=false
              </code>{' '}
              in{' '}
              <code className="text-brand-burg font-semibold">.env</code>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}