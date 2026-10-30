import React, { useState } from 'react';
import { ResultCard } from './ResultCard';
import { Search, Eye, AlertCircle } from 'lucide-react';

export function ResultsList({
  query,
  results = [],
  resultCount = 0,
  lowRelevanceCount = 0,
  onShowLowRelevance,
}) {
  const [showLowRel, setShowLowRel] = useState(false);

  if (!query) {
    return null;
  }

  if (!results || results.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          Not found in this repository
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No code snippets scored above the relevance threshold (0.35) for <span className="font-mono text-slate-300">"{query}"</span>. Try broader terminology, symbol names, or reviewing repository files.
        </p>
        {lowRelevanceCount > 0 && (
          <div className="pt-2">
            <button
              onClick={() => {
                setShowLowRel(true);
                if (onShowLowRelevance) onShowLowRelevance();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-400 border border-slate-700"
            >
              <Eye className="w-3.5 h-3.5" />
              Show {lowRelevanceCount} low-relevance match{lowRelevanceCount === 1 ? '' : 'es'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" role="feed" aria-busy="false">
      {/* Summary line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-slate-400 font-sans">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-400" />
          <span>
            <strong className="text-slate-100 font-semibold">{resultCount}</strong>{' '}
            {resultCount === 1 ? 'result' : 'results'} for{' '}
            <span className="font-mono text-slate-200">"{query}"</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {lowRelevanceCount > 0 && (
            <span className="text-slate-500 font-mono">
              ({lowRelevanceCount} low-relevance hidden)
            </span>
          )}
          <span className="text-slate-500 hidden sm:inline">
            Ranked by relevance score
          </span>
        </div>
      </div>

      {/* List of cards */}
      <div className="space-y-4">
        {results.map((result, index) => {
          const rank = index + 1;
          return (
            <ResultCard
              key={`${result.file_path}-${result.start_line}-${index}`}
              result={result}
              rank={rank}
              defaultExpanded={index === 0}
            />
          );
        })}
      </div>
    </div>
  );
}
