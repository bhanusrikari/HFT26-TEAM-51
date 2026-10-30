import React from 'react';
import { Sparkles, AlertCircle, Info, ExternalLink, Bookmark } from 'lucide-react';

export function ExplanationPanel({
  explanation,
  explanationError,
  isLoading,
  results = [],
  activeRepo = null,
  onCitationClick,
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-purple-900/40 bg-[#161323]/50 p-5 shadow-sm space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-slate-800 rounded-full" />
          <div className="h-4 w-64 bg-slate-800 rounded" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3.5 bg-slate-800 rounded w-full" />
          <div className="h-3.5 bg-slate-800 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!explanation && !explanationError) {
    return null;
  }

  // Helper to extract GitHub base URL if repo came from GitHub
  const getGithubUrl = (filePath, startLine, endLine) => {
    if (!activeRepo) return null;
    const url = activeRepo.url || '';
    if (url.includes('github.com')) {
      const cleanUrl = url.replace(/\.git$/, '').replace(/\/$/, '');
      return `${cleanUrl}/blob/main/${filePath}#L${startLine}-L${endLine}`;
    }
    return null;
  };

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
            className="inline-flex items-center justify-center mx-1 px-1.5 py-0.2 rounded text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer align-baseline"
            title={`Jump to snippet #${citationNumber}`}
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
                <code
                  key={sIdx}
                  className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-slate-900 text-purple-300 border border-slate-700/60"
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
      <div className="absolute top-0 right-0 w-64 h-32 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-purple-900/30 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-950 text-purple-400 border border-purple-800/60">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold text-purple-200 tracking-tight">
            AI explanation (grounded in retrieved code)
          </h2>
        </div>
      </div>

      {/* Main explanation content */}
      {explanation && (
        <div className="text-sm text-slate-200 leading-relaxed font-sans select-text">
          {renderFormattedText(explanation)}
        </div>
      )}

      {/* Sources Row */}
      {results && results.length > 0 && (
        <div className="pt-2 border-t border-purple-900/20">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-indigo-400" />
            Cited Sources
          </span>
          <div className="flex flex-wrap gap-1.5">
            {results.slice(0, 5).map((res, i) => {
              const ghLink = getGithubUrl(res.file_path, res.start_line, res.end_line);
              return (
                <div key={i} className="inline-flex items-center rounded border border-slate-700 bg-slate-900/80 text-[11px] font-mono text-slate-300">
                  <button
                    type="button"
                    onClick={() => onCitationClick && onCitationClick(i + 1)}
                    className="px-2 py-0.5 hover:text-white transition-colors flex items-center gap-1"
                    title={`Jump to [${i + 1}]`}
                  >
                    <span className="text-indigo-400 font-bold">[{i + 1}]</span>
                    <span>{res.file_path}:{res.start_line}-{res.end_line}</span>
                  </button>
                  {ghLink && (
                    <a
                      href={ghLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 border-l border-slate-700 hover:text-indigo-400 text-slate-500"
                      title="View on GitHub"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graceful fallback if explanation_error occurred */}
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
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 border-t border-purple-900/20">
        <Info className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        <span>
          Explanations are strictly grounded in retrieved snippets; verify against original code.
        </span>
      </div>
    </div>
  );
}
