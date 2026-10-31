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
      <div className="rounded-xl border border-cream-dark bg-cream-warm p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-dark text-ink-muted">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-base font-semibold text-ink">
          Not found in this repository
        </h3>

        <p className="text-xs text-ink-muted max-w-md mx-auto">
          No code snippets scored above the relevance threshold (0.35) for{' '}
          <span className="font-mono text-brand-burg">"{query}"</span>. Try
          broader terminology, symbol names, or reviewing repository files.
        </p>

        {lowRelevanceCount > 0 && (
          <div className="pt-2">
            <button
              onClick={() => {
                setShowLowRel(true);
                if (onShowLowRelevance) onShowLowRelevance();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream-dark hover:bg-cream text-xs font-medium text-brand-burg border border-cream-dark transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Show {lowRelevanceCount} low-relevance match
              {lowRelevanceCount === 1 ? '' : 'es'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" role="feed" aria-busy="false">
      {/* Summary line */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-ink-muted font-sans">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-brand-burg" />
          <span>
            <strong className="text-ink font-semibold">{resultCount}</strong>{' '}
            {resultCount === 1 ? 'snippet' : 'snippets'} returned for{' '}
            <span className="font-mono text-brand-burg font-semibold">
              "{query}"
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {lowRelevanceCount > 0 && (
            <span className="text-ink-muted font-mono">
              ({lowRelevanceCount} low-relevance hidden)
            </span>
          )}

          <span className="text-ink-muted hidden sm:inline">
            Ranked by relevance score
          </span>
        </div>
      </div>

      {/* List of cards */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.file_path}-${result.start_line}-${index}`}
            result={result}
            rank={index + 1}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  );
}