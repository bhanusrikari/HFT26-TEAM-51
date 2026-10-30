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
  const [topK, setTopK] = useState(10);
  const [explain, setExplain] = useState(true);

  // Sync when external query or history item is clicked
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
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
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
            className="w-full pl-11 pr-24 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            aria-label="Search codebase"
          />

          {/* Submit button inside input */}
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <button
              type="submit"
              disabled={!hasActiveRepo || !query.trim() || isSearching}
              className="h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              aria-label="Submit search query"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search controls bar: top_k (5/10/20) + Explain with AI toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            {/* top_k selector: 5 / 10 / 20 */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Results:</span>
              </span>
              <div className="inline-flex rounded-md bg-slate-900 border border-slate-700 p-0.5" role="group">
                {[5, 10, 20].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTopK(k)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                      topK === k
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
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
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600 relative border border-slate-700" />
              <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Explain with AI</span>
              </span>
            </label>
          </div>

          {!hasActiveRepo && (
            <span className="text-[11px] text-amber-400/90 italic">
              Indexing required before search
            </span>
          )}
        </div>
      </form>

      {/* Example query chips */}
      {sampleQueries.length > 0 && hasActiveRepo && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] text-slate-400">Suggestions:</span>
          {sampleQueries.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleChipClick(sample)}
              disabled={isSearching}
              className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 transition-colors disabled:opacity-50"
            >
              {sample}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
