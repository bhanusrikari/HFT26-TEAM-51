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
    <div className="rounded-xl border border-dark-border/80 bg-dark-surface/60 p-8 sm:p-12 text-center space-y-6">
      <div className="inline-flex p-3 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue">
        <FolderSearch className="w-8 h-8" />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg font-semibold text-dark-bright">
          {repoName ? `Explore "${repoName}"` : 'Select or index a repository'}
        </h3>
        <p className="text-sm text-dark-muted leading-relaxed">
          Ask questions in natural language or enter exact symbols to inspect code snippets grounded in the index.
        </p>
      </div>

      {/* Suggested queries */}
      {sampleQueries && sampleQueries.length > 0 && (
        <div className="max-w-lg mx-auto pt-2 space-y-2">
          <span className="text-xs font-medium text-dark-muted uppercase tracking-wider block">
            Suggested questions
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSampleClick && onSampleClick(q)}
                className="px-3 py-1.5 rounded-full text-xs font-mono bg-dark-subtle hover:bg-dark-border text-dark-text hover:text-white border border-dark-border/60 transition-colors text-left"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3 Steps guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto text-left">
        <div className="p-4 rounded-lg bg-[#0d1117] border border-dark-border/60 space-y-1.5">
          <div className="text-xs font-mono font-bold text-brand-blue">01 / Index</div>
          <div className="text-xs font-medium text-dark-bright">ZIP or GitHub</div>
          <p className="text-[11px] text-dark-muted">
            Code is chunked by AST into functions, classes, and blocks.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[#0d1117] border border-dark-border/60 space-y-1.5">
          <div className="text-xs font-mono font-bold text-purple-400">02 / Search</div>
          <div className="text-xs font-medium text-dark-bright">Hybrid Retrieval</div>
          <p className="text-[11px] text-dark-muted">
            Ranked with weighted lexical, symbol, path, and vector scoring.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[#0d1117] border border-dark-border/60 space-y-1.5">
          <div className="text-xs font-mono font-bold text-emerald-400">03 / Evidence</div>
          <div className="text-xs font-medium text-dark-bright">Grounded AI</div>
          <p className="text-[11px] text-dark-muted">
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
    <div className="rounded-xl border border-dark-border/80 bg-dark-surface p-8 text-center space-y-4">
      <div className="inline-flex p-3 rounded-full bg-dark-subtle text-dark-muted">
        <Search className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-base font-medium text-dark-bright">
          No matching code found
        </h4>
        <p className="text-sm text-dark-muted">
          No code snippets matched your query for{' '}
          <span className="font-mono text-dark-text">"{query}"</span>.
        </p>
      </div>
      <p className="text-xs text-dark-muted max-w-xs mx-auto">
        Try different keywords, a broader term, or a specific function or class name.
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-dark-subtle hover:bg-dark-border text-dark-bright transition-colors"
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
      <div className="h-4 w-48 bg-dark-subtle rounded" />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-dark-border bg-dark-surface p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-dark-subtle" />
              <div className="h-4 w-40 bg-dark-subtle rounded" />
            </div>
            <div className="h-4 w-20 bg-dark-subtle rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-24 bg-dark-subtle rounded" />
            <div className="h-5 w-16 bg-dark-subtle rounded" />
          </div>
          <div className="h-28 bg-[#0d1117] rounded border border-dark-border/40" />
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
      className={`rounded-lg p-4 border flex items-start justify-between gap-3 ${
        is404
          ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
          : 'bg-red-950/20 border-red-800/60 text-red-200'
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            is404 ? 'text-amber-400' : 'text-brand-red'
          }`}
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {is404 ? 'Repository not found (404)' : 'Error encountered'}
          </p>
          <p className="text-xs opacity-90 font-mono select-text">
            {error.detail || error.message || String(error)}
          </p>
          {is404 && (
            <p className="text-xs text-amber-300/80 pt-1">
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
            className="px-3 py-1.5 rounded text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-600/40 transition-colors"
          >
            Re-index repository
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-dark-subtle hover:bg-dark-border text-dark-bright border border-dark-border transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}

