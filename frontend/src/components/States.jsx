import React from 'react';
import {
  Code,
  Search,
  AlertTriangle,
  FolderSearch,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

/**
 * Initial empty state when no query has been run yet
 */
export function InitialState({ repoName, onSampleClick, sampleQueries = [] }) {
  return (
    <div className="rounded-xl border border-cream-darker bg-cream-dark/60 p-8 sm:p-12 text-center space-y-6">
      <div
        className="inline-flex p-3 rounded-2xl border"
        style={{ background: 'rgba(107,26,42,0.08)', borderColor: 'rgba(107,26,42,0.2)' }}
      >
        <FolderSearch className="w-8 h-8" style={{ color: '#6B1A2A' }} />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg font-semibold text-ink">
          {repoName ? `Explore "${repoName}"` : 'Select or index a repository'}
        </h3>
        <p className="text-sm text-ink-muted leading-relaxed">
          Ask questions in natural language or enter exact symbols to inspect code snippets grounded in the index.
        </p>
      </div>

      {/* Suggested queries */}
      {sampleQueries && sampleQueries.length > 0 && (
        <div className="max-w-lg mx-auto pt-2 space-y-2">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider block">
            Suggested questions
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSampleClick && onSampleClick(q)}
                className="px-3 py-1.5 rounded-full text-xs font-mono bg-cream border border-cream-darker text-ink-muted hover:bg-cream-darker hover:text-ink transition-colors text-left"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3 Steps guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto text-left">
        <div className="p-4 rounded-lg bg-cream border border-cream-darker space-y-1.5">
          <div className="text-xs font-mono font-bold text-brand-burg">01 / Index</div>
          <div className="text-xs font-medium text-ink">ZIP or GitHub</div>
          <p className="text-[11px] text-ink-muted">
            Code is chunked by AST into functions, classes, and blocks.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-cream border border-cream-darker space-y-1.5">
          <div className="text-xs font-mono font-bold text-brand-burgLight">02 / Search</div>
          <div className="text-xs font-medium text-ink">Hybrid Retrieval</div>
          <p className="text-[11px] text-ink-muted">
            Ranked with weighted lexical, symbol, path, and vector scoring.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-cream border border-cream-darker space-y-1.5">
          <div className="text-xs font-mono font-bold" style={{ color: '#B8860B' }}>03 / Evidence</div>
          <div className="text-xs font-medium text-ink">Grounded AI</div>
          <p className="text-[11px] text-ink-muted">
            LLM explanation with clickable citations jumping directly to line ranges.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Zero results state
 */
export function ZeroResultsState({ query, onClear }) {
  return (
    <div className="rounded-xl border border-cream-darker bg-cream-dark p-8 text-center space-y-4">
      <div className="inline-flex p-3 rounded-full bg-cream text-ink-muted">
        <Search className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-base font-medium text-ink">
          No matching code found
        </h4>
        <p className="text-sm text-ink-muted">
          No code snippets matched your query for{' '}
          <span className="font-mono text-ink">"{query}"</span>.
        </p>
      </div>
      <p className="text-xs text-ink-muted max-w-xs mx-auto">
        Try different keywords, a broader term, or a specific function or class name.
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-cream hover:bg-cream-darker text-ink transition-colors border border-cream-darker"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/**
 * Loading skeleton for search results
 */
export function ResultsSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Loading search results">
      <div className="h-4 w-48 bg-cream-darker rounded" />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-cream-darker bg-cream-dark p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cream-darker" />
              <div className="h-4 w-40 bg-cream-darker rounded" />
            </div>
            <div className="h-4 w-20 bg-cream-darker rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-24 bg-cream-darker rounded" />
            <div className="h-5 w-16 bg-cream-darker rounded" />
          </div>
          <div className="h-28 bg-[#1C0A0D]/10 rounded border border-cream-darker/40" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error banner with retry option
 */
export function ErrorBanner({ error, onRetry, is404 = false, onReindex }) {
  if (!error) return null;

  return (
    <div
      className="rounded-lg p-4 border flex items-start justify-between gap-3 bg-brand-burg/5 border-brand-burg/20 text-brand-burg"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="w-5 h-5 shrink-0 mt-0.5 text-brand-burg"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {is404 ? 'Repository not found (404)' : 'Error encountered'}
          </p>
          <p className="text-xs opacity-90 font-mono select-text">
            {error.detail || error.message || String(error)}
          </p>
          {is404 && (
            <p className="text-xs text-brand-burg/80 pt-1">
              This repository ID is unknown or expired. Please re-index the archive or URL.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {is404 && onReindex && (
          <button
            type="button"
            onClick={onReindex}
            className="px-3 py-1.5 rounded text-xs font-medium bg-brand-burg/10 hover:bg-brand-burg/15 text-brand-burg border border-brand-burg/25 transition-colors"
          >
            Re-index repository
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-cream hover:bg-cream-darker text-ink border border-cream-darker transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}
