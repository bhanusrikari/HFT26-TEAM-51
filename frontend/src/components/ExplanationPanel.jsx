import React from 'react';
import { Sparkles, AlertCircle, Info } from 'lucide-react';

export function ExplanationPanel({ explanation, explanationError, isLoading, onCitationClick }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-cream-darker bg-cream-dark p-5 shadow-sm space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-cream-darker rounded-full" />
          <div className="h-4 w-64 bg-cream-darker rounded" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3.5 bg-cream-darker rounded w-full" />
          <div className="h-3.5 bg-cream-darker rounded w-5/6" />
          <div className="h-3.5 bg-cream-darker rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!explanation && !explanationError) return null;

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const citationNumber = parseInt(match[1], 10);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onCitationClick && onCitationClick(citationNumber)}
            className="inline-flex items-center justify-center mx-1 px-1.5 rounded-md text-[11px] font-mono font-bold border transition-all focus:outline-none cursor-pointer align-baseline hover:scale-105 active:scale-95 shadow-2xs"
            style={{ background: 'rgba(107,26,42,0.12)', color: '#6B1A2A', borderColor: 'rgba(107,26,42,0.35)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(107,26,42,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(107,26,42,0.12)')}
            title={`Jump to code snippet #${citationNumber}`}
            aria-label={`Jump to citation #${citationNumber}`}
          >
            [{citationNumber}]
          </button>
        );
      }
      const codeSegments = part.split(/(`[^`]+`)/g);
      return (
        <span key={index}>
          {codeSegments.map((seg, sIdx) => {
            if (seg.startsWith('`') && seg.endsWith('`')) {
              return (
                <code key={sIdx} className="px-1.5 py-0.5 rounded-md text-[12px] font-mono font-semibold border shadow-2xs mx-0.5"
                  style={{ background: '#1C0A0D', color: '#FAF6F0', borderColor: '#E4D5C4' }}>
                  {seg.slice(1, -1)}
                </code>
              );
            }
            return seg;
          })}
        </span>
      );
    });
  };

  return (
    <div className="rounded-xl border border-brand-burg/20 bg-cream-dark p-5 shadow-sm space-y-3.5 relative overflow-hidden animate-fadeIn"
      role="region" aria-label="AI Explanation">
      <div className="absolute top-0 right-0 w-64 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(107,26,42,0.05)' }} />

      <div className="flex items-center gap-2 border-b border-brand-burg/15 pb-3">
        <div className="p-1 rounded-lg border shadow-2xs"
          style={{ background: 'rgba(107,26,42,0.08)', borderColor: 'rgba(107,26,42,0.25)' }}>
          <Sparkles className="w-4 h-4 animate-pulse text-brand-burg" />
        </div>
        <h2 className="text-sm font-bold tracking-tight text-brand-burg">
          AI explanation (grounded in retrieved code)
        </h2>
      </div>

      {explanation && (
        <div className="text-sm text-ink leading-relaxed font-sans select-text">
          {renderFormattedText(explanation)}
        </div>
      )}

      {explanationError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">AI explanation unavailable</span>
            <span className="text-amber-700/80">{explanationError}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-muted border-t border-brand-burg/10">
        <Info className="w-3.5 h-3.5 shrink-0 text-brand-burgLight" />
        <span>Explanations are generated from the retrieved snippets only; verify against the source.</span>
      </div>
    </div>
  );
}
