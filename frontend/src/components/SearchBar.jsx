import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export function SearchBar({
  onSearch,
  isSearching,
  hasActiveRepo,
  activeRepoName,
  sampleQueries = [],
  externalQuery,
}) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(10);
  const [explain, setExplain] = useState(true);

  // Sync when an external query or history item is selected
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

  const handleTopKSelect = (k) => {
    setTopK(k);

    const cleanQuery = query.trim();

    if (hasActiveRepo && !isSearching && cleanQuery) {
      onSearch({ query: cleanQuery, top_k: k, explain });
    }
  };

  const handleExplainToggle = (checked) => {
    setExplain(checked);

    const cleanQuery = query.trim();

    if (hasActiveRepo && !isSearching && cleanQuery) {
      onSearch({ query: cleanQuery, top_k: topK, explain: checked });
    }
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
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-brand-burg animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-ink-muted" />
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
            className="w-full pl-11 pr-24 py-3 bg-cream-warm border border-cream-darker rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-burg focus:ring-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            style={{ '--tw-ring-color': 'rgba(107,26,42,0.2)' }}
            aria-label="Search codebase"
          />

          {/* Submit button */}
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={!hasActiveRepo || !query.trim() || isSearching}
              className="h-8 px-3 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
              style={{ background: '#6B1A2A', color: '#FAF6F0' }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = '#4A0E1C';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#6B1A2A';
              }}
              aria-label="Submit search query"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search controls: result count and AI explanation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-ink">
          <div className="flex items-center gap-5">
            {/* Result count selector */}
            <div className="flex items-center gap-2">
              <span className="text-ink font-medium flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-burg" />
                <span>Show results:</span>
              </span>

              <div
                className="inline-flex rounded-lg bg-cream-dark border border-cream-darker p-0.5 shadow-inner"
                role="group"
                aria-label="Number of results filter"
              >
                {[3, 5, 10, 15].map((k) => {
                  const isSelected = topK === k;

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleTopKSelect(k)}
                      aria-pressed={isSelected}
                      title={`Show top ${k} results`}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                        isSelected
                          ? 'shadow-sm scale-105 z-10'
                          : 'text-ink-muted hover:text-ink hover:bg-cream/60'
                      }`}
                      style={
                        isSelected
                          ? { background: '#6B1A2A', color: '#FAF6F0' }
                          : {}
                      }
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI explanation toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={explain}
                onChange={(e) => handleExplainToggle(e.target.checked)}
                className="sr-only peer"
              />

              <div
                className={`w-9 h-5 rounded-full transition-colors relative border ${
                  explain
                    ? 'bg-brand-burg border-brand-burg'
                    : 'bg-cream-darker border-cream-darker'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-cream shadow-md transition-transform duration-200 ${
                    explain ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>

              <span className="text-xs font-medium text-ink group-hover:text-brand-burg flex items-center gap-1.5 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-brand-burg" />
                <span>Explain with AI</span>
              </span>
            </label>
          </div>

          {!hasActiveRepo && (
            <span className="text-brand-burg bg-brand-burg/5 px-2 py-0.5 rounded border border-brand-burg/20 text-xs font-mono">
              ⚡ Index a repository to activate search
            </span>
          )}
        </div>
      </form>

      {/* Example query suggestions */}
      {hasActiveRepo && sampleQueries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-ink-muted mr-1">
            Suggested:
          </span>

          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(sample)}
              disabled={isSearching}
              className="text-xs font-mono px-2.5 py-1 rounded-md bg-cream-warm hover:bg-cream text-ink border border-cream-darker hover:border-brand-burg/40 transition-colors disabled:opacity-50 shadow-xs"
            >
              {sample}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}