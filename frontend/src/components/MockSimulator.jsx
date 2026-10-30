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

  // Show error-simulation controls ONLY when mock mode is on
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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${
          currentError !== 'none'
            ? 'bg-amber-950/70 border-amber-600/80 text-amber-300 animate-pulse'
            : 'bg-purple-950/60 border-purple-800/80 text-purple-300 hover:bg-purple-900/60'
        }`}
        title="Mock Error Simulation Controls"
        aria-expanded={isOpen}
      >
        <Bug className="w-3.5 h-3.5" />
        <span>Mock Simulation</span>
        {currentError !== 'none' && (
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        )}
      </button>

      {/* Popover menu for error simulation */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-lg bg-dark-surface border border-dark-border shadow-2xl p-4 z-50 text-xs space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-dark-border/80 pb-2">
              <span className="font-semibold text-dark-bright flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-purple-400" />
                <span>Simulate Backend Scenarios</span>
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
                Mock ON
              </span>
            </div>

            {/* Simulated Error States */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-dark-muted block">
                Select test scenario:
              </span>

              {[
                { id: 'none', label: 'Normal (Clean 200 OK)', color: 'text-emerald-400' },
                { id: 'empty', label: 'Empty results (0 matches)', color: 'text-dark-text' },
                { id: 'explanation_error', label: 'Explanation Error (LLM quota)', color: 'text-amber-400' },
                { id: '404', label: '404 Not Found (Missing Repo)', color: 'text-amber-400' },
                { id: '502', label: '502 Bad Gateway (Upstream Fail)', color: 'text-rose-400' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleErrorChange(item.id)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between font-mono text-xs transition-colors ${
                    currentError === item.id
                      ? 'bg-dark-subtle text-white font-semibold border border-dark-border'
                      : 'text-dark-muted hover:bg-[#0d1117] hover:text-dark-bright'
                  }`}
                >
                  <span className={item.color}>{item.label}</span>
                  {currentError === item.id && (
                    <Check className="w-3.5 h-3.5 text-brand-blue" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-dark-border/60 text-[11px] text-dark-muted leading-tight">
              To connect to real backend, set <code className="text-purple-300">VITE_USE_MOCK=false</code> in <code className="text-purple-300">.env</code>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
