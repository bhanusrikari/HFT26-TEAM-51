import React, { useState, useEffect } from 'react';
import { Search, Sparkles, SlidersHorizontal, Loader2, ArrowRight } from 'lucide-react';

export function SearchBar({
  onSearch,
  isSearching,
  hasActiveRepo,
  activeRepoName,
  sampleQueries = [],
  externalQuery,
}) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [explain, setExplain] = useState(true);

  // Sync when external query chip is clicked
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== null) {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasActiveRepo || isSearching) return;
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    onSearch({ query: cleanQuery, top_k: topK, explain });
  };

  const handleChipClick = (sample) => {
    setQuery(sample);
    if (hasActiveRepo && !isSearching) {
      onSearch({ query: sample, top_k: topK, explain });
    }
  };

  return (
    <div className="space-y-3">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-muted">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-dark-muted" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!hasActiveRepo || isSearching}
            placeholder={
              hasActiveRepo
                ? `Ask about ${activeRepoName || 'this codebase'}… e.g. Where is authentication implemented?`
                : 'Select or index a repository first to begin searching'
            }
            className="w-full pl-11 pr-24 py-3 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-bright placeholder:text-dark-muted/60 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            aria-label="Search codebase"
          />

          {/* Submit button inside input */}
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={!hasActiveRepo || !query.trim() || isSearching}
              className="h-8 px-3 rounded-md bg-brand-blue hover:bg-brand-hover text-[#0d1117] font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              aria-label="Submit search query"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search controls bar: top_k + Explain with AI toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-dark-muted">
          <div className="flex items-center gap-4">
            {/* top_k selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-dark-muted flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Results:</span>
              </span>
              <div className="inline-flex rounded-md bg-dark-surface border border-dark-border p-0.5" role="group">
                {[3, 5, 10].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTopK(k)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                      topK === k
                        ? 'bg-dark-subtle text-dark-bright shadow-xs'
                        : 'text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* AI explanation toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={explain}
                onChange={(e) => setExplain(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-dark-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 relative border border-dark-border" />
              <span className="text-xs font-medium text-dark-text group-hover:text-dark-bright flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Explain with AI</span>
              </span>
            </label>
          </div>

          {!hasActiveRepo && (
            <span className="text-amber-400/90 text-xs font-mono">
              ⚡ Index a repository to activate search
            </span>
          )}
        </div>
      </form>

      {/* Example query chips */}
      {hasActiveRepo && sampleQueries && sampleQueries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-dark-muted mr-1">Try:</span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSearching}
              onClick={() => handleChipClick(sample)}
              className="text-xs font-mono px-2.5 py-1 rounded-md bg-dark-surface hover:bg-dark-subtle text-dark-text hover:text-white border border-dark-border/80 transition-colors disabled:opacity-50"
            >
              {sample}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

