import React, { useState } from 'react';
import {
  isMockEnabled,
  setMockMode,
  setSimulatedError,
  getSimulatedError,
} from '../api/client';
import { Bug, Check, AlertOctagon, HelpCircle } from 'lucide-react';

export function MockSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentError, setCurrentError] = useState(getSimulatedError());
  const [mockActive, setMockActive] = useState(isMockEnabled());

  const handleErrorChange = (mode) => {
    setCurrentError(mode);
    setSimulatedError(mode);
  };

  const handleToggleMock = (e) => {
    const val = e.target.checked;
    setMockActive(val);
    setMockMode(val);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${
          currentError !== 'none'
            ? 'bg-amber-950/70 border-amber-600/80 text-amber-300 animate-pulse'
            : mockActive
            ? 'bg-purple-950/60 border-purple-800/80 text-purple-300 hover:bg-purple-900/60'
            : 'bg-dark-subtle border-dark-border text-dark-muted hover:text-dark-bright'
        }`}
        title="Mock Mode & Error Simulation Settings"
        aria-expanded={isOpen}
      >
        <Bug className="w-3.5 h-3.5" />
        <span>{mockActive ? 'Mock Mode' : 'Live Mode'}</span>
        {currentError !== 'none' && (
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        )}
      </button>

      {/* Popover menu */}
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
                <span>Simulation Controls</span>
              </span>
              <span className="text-[10px] font-mono text-dark-muted">Dev Tools</span>
            </div>

            {/* Mock Mode Switch */}
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-dark-text font-medium">Use Mock Data</span>
              <input
                type="checkbox"
                checked={mockActive}
                onChange={handleToggleMock}
                className="w-4 h-4 accent-purple-600 rounded bg-dark-subtle border-dark-border"
              />
            </label>

            {/* Simulated Error States */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-dark-muted block">
                Simulate Backend Edge Cases:
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
              Switching to real backend only requires <code className="text-purple-300">VITE_USE_MOCK=false</code> in <code className="text-purple-300">.env</code>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

