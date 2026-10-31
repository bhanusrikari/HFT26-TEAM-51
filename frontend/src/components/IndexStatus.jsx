```jsx
import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  FileCode2,
  Layers,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { formatNumber } from '../lib/format';

export function IndexStatus({
  isIndexing,
  indexingStep = 'Uploading…',
  activeRepo,
  repoDetails,
}) {
  const [showSkipped, setShowSkipped] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const repo = repoDetails || activeRepo;

  const isPending =
    isIndexing ||
    (repo &&
      ['queued', 'cloning', 'parsing', 'embedding'].includes(repo.status));

  const isFailed = repo && repo.status === 'failed';

  const handleCopyId = async (repoId) => {
    if (!repoId) return;

    try {
      await navigator.clipboard.writeText(repoId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch (error) {
      console.error('Failed to copy repository ID:', error);
    }
  };

  if (isPending) {
    const stageName = repo?.status
      ? repo.status === 'cloning'
        ? 'Cloning repository…'
        : repo.status === 'parsing'
          ? 'Parsing files & AST…'
          : repo.status === 'embedding'
            ? 'Generating embeddings…'
            : repo.status === 'queued'
              ? 'Queued for indexing…'
              : indexingStep || 'Indexing in progress…'
      : indexingStep || 'Uploading…';

    const progressPct =
      repo?.progress != null
        ? Math.min(100, Math.max(0, Math.round(repo.progress * 100)))
        : 45;

    return (
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{
          borderColor: 'rgba(107,26,42,0.35)',
          background: 'rgba(107,26,42,0.05)',
        }}
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <Loader2
            className="w-5 h-5 animate-spin shrink-0"
            style={{ color: '#6B1A2A' }}
          />

          <div className="space-y-0.5">
            <span
              className="text-xs font-semibold block"
              style={{ color: '#8B2A3C' }}
            >
              {stageName}
            </span>

            <span className="text-[11px] text-ink-muted block font-mono">
              Stage: {repo?.status || 'indexing'} ({progressPct}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-cream-darker h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(10, progressPct)}%`,
              background: '#6B1A2A',
            }}
          />
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div
        className="rounded-lg border p-4 space-y-2 text-xs"
        style={{
          borderColor: 'rgba(220,38,38,0.3)',
          background: 'rgba(220,38,38,0.05)',
        }}
      >
        <div className="flex items-center gap-2 text-red-600 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Repository Indexing Failed</span>
        </div>

        <p className="text-ink-muted font-mono text-[11px]">
          {repo.error || 'Failed to index repository'}
        </p>
      </div>
    );
  }

  if (!repo) return null;

  const skipped = repo.skipped || {};

  const totalSkipped = Object.values(skipped).reduce(
    (acc, value) => acc + (Number(value) || 0),
    0
  );

  return (
    <div className="rounded-lg border border-cream-darker bg-cream-warm p-3.5 space-y-3 text-xs">
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />

            <h4
              className="font-semibold text-ink truncate font-mono text-xs"
              title={repo.name}
            >
              {repo.name}
            </h4>
          </div>

          {/* Repo ID with Copy Button */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-ink-muted">
            <Hash className="w-3 h-3 text-ink-faint shrink-0" />

            <span className="truncate">{repo.repo_id}</span>

            <button
              type="button"
              onClick={() => handleCopyId(repo.repo_id)}
              className="p-0.5 hover:text-ink text-ink-faint transition-colors"
              title="Copy repo ID"
              aria-label="Copy repository ID"
            >
              {copiedId ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shrink-0 bg-success/10 text-success border border-success/30">
          INDEXED
        </span>
      </div>

      {/* Stats: Indexed Files & Chunks */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-cream-darker/60">
        <div className="p-2 rounded bg-cream border border-cream-darker flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-brand-burg shrink-0" />

          <div>
            <div className="text-[10px] text-ink-muted">Files</div>
            <div className="font-mono font-bold text-ink text-xs">
              {formatNumber(repo.indexed_files)}
            </div>
          </div>
        </div>

        <div className="p-2 rounded bg-cream border border-cream-darker flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-burgLight shrink-0" />

          <div>
            <div className="text-[10px] text-ink-muted">Chunks</div>
            <div className="font-mono font-bold text-ink text-xs">
              {formatNumber(repo.indexed_chunks)}
            </div>
          </div>
        </div>
      </div>

      {/* Language Breakdown */}
      {repo.languages && Object.keys(repo.languages).length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wider block">
            Languages
          </span>

          <div className="flex flex-wrap gap-1">
            {Object.entries(repo.languages).map(([lang, count]) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-cream-dark text-ink border border-cream-darker"
              >
                <span>{lang}</span>
                <span className="text-ink-muted text-[10px]">
                  ({count})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skipped Files Dropdown */}
      {totalSkipped > 0 && (
        <div className="pt-1 border-t border-cream-darker/60">
          <button
            type="button"
            onClick={() => setShowSkipped(!showSkipped)}
            className="flex items-center justify-between w-full text-[11px] text-ink-muted hover:text-ink transition-colors"
            aria-expanded={showSkipped}
          >
            <span>{totalSkipped} non-code files skipped</span>

            {showSkipped ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showSkipped && (
            <div className="mt-2 p-2 rounded bg-cream border border-cream-darker/40 space-y-1 text-[10px] font-mono text-ink-muted">
              {Object.entries(skipped).map(([reason, count]) => {
                if (count === 0) return null;

                return (
                  <div key={reason} className="flex justify-between">
                    <span className="capitalize">
                      {reason.replace('_', ' ')}:
                    </span>

                    <span className="text-ink font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```