import React from 'react';
import { Sparkles, AlertCircle, Info, ExternalLink } from 'lucide-react';

export function ExplanationPanel({
  explanation,
  explanationError,
  isLoading,
  onCitationClick,
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-dark-border bg-dark-surface p-5 shadow-sm space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-dark-subtle rounded-full" />
          <div className="h-4 w-64 bg-dark-subtle rounded" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3.5 bg-dark-subtle rounded w-full" />
          <div className="h-3.5 bg-dark-subtle rounded w-5/6" />
          <div className="h-3.5 bg-dark-subtle rounded w-4/6" />
        </div>
      </div>
    );
  }

  // If both explanation and explanationError are absent (e.g. before any search or if explain was disabled)
  if (!explanation && !explanationError) {
    return null;
  }

  // Function to parse [1], [2] citations and code backticks into interactive elements
  const renderFormattedText = (text) => {
    if (!text) return null;

    // Split text by citations like [1], [2], etc.
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
            className="inline-flex items-center justify-center mx-1 px-1.5 py-0.2 rounded text-[11px] font-mono font-semibold bg-brand-blue/20 text-brand-hover hover:bg-brand-blue/30 border border-brand-blue/40 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer align-baseline"
            title={`Jump to snippet #${citationNumber}`}
            aria-label={`Jump to citation #${citationNumber}`}
          >
            [{citationNumber}]
          </button>
        );
      }

      // Format backticked code tokens inside standard prose
      const codeSegments = part.split(/(`[^`]+`)/g);
      return (
        <span key={index}>
          {codeSegments.map((seg, sIdx) => {
            if (seg.startsWith('`') && seg.endsWith('`')) {
              return (
                <code
                  key={sIdx}
                  className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-[#0d1117] text-purple-300 border border-dark-border/60"
                >
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
    <div
      className="rounded-lg border border-purple-900/40 bg-[#161323]/50 p-5 shadow-sm space-y-3 relative overflow-hidden"
      role="region"
      aria-label="AI Explanation"
    >
      {/* Decorative subtle ambient gradient */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-purple-900/30 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-950 text-purple-400 border border-purple-800/60">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <h2 className="text-sm font-semibold text-purple-200 tracking-tight">
            AI explanation (grounded in retrieved code)
          </h2>
        </div>
      </div>

      {/* Main explanation content */}
      {explanation ? (
        <div className="text-sm text-dark-text leading-relaxed font-sans select-text">
          {renderFormattedText(explanation)}
        </div>
      ) : null}

      {/* Graceful fallback if explanation_error occurred (LLM quota, outage, etc.) */}
      {explanationError && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-950/20 border border-amber-900/50 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">AI explanation unavailable</span>
            <span className="text-amber-200/80">{explanationError}</span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-dark-muted border-t border-purple-900/20">
        <Info className="w-3.5 h-3.5 shrink-0 text-dark-muted/80" />
        <span>
          Explanations are generated from the retrieved snippets only; verify against the source.
        </span>
      </div>
    </div>
  );
}

