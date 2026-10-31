import React from 'react';
import { ResultCard } from './ResultCard';
import { Search } from 'lucide-react';

export function ResultsList({
  query,
  results = [],
  resultCount = 0,
}) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" role="feed" aria-busy="false">
      {/* Summary line */}
      <div className="flex items-center justify-between gap-2 px-1 text-sm text-ink-muted font-sans">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-brand-burg" />
          <span>
            <strong className="text-ink font-semibold">{resultCount}</strong>{' '}
            {resultCount === 1 ? 'snippet' : 'snippets'} returned for{' '}
            <span className="font-mono text-brand-burg font-semibold">"{query}"</span>
          </span>
        </div>
        <span className="text-xs text-ink-muted hidden sm:inline">
          Ranked by relevance score
        </span>
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
              defaultExpanded={index === 0} // First card expanded by default
            />
          );
        })}
      </div>
    </div>
  );
}
