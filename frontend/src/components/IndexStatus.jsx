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
  AlertCircle,
  Hash,
} from 'lucide-react';
import { formatNumber } from '../lib/format';
import { LanguageBadge } from './Badge';

export function IndexStatus({
  isIndexing,
  indexingStep = 'Uploading…',
  activeRepo,
  repoDetails,
}) {
  const [showSkipped, setShowSkipped] = useState(false);

  // 1. Loading state with animated spinner and step text
  if (isIndexing) {
    return (
      <div
        className="rounded-lg border border-brand-blue/40 bg-brand-blue/5 p-4 space-y-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-brand-blue animate-spin shrink-0" />
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-brand-hover block">
              {indexingStep || 'Indexing…'}
            </span>
          </div>
        </div>

        {/* Progress bar shimmer */}
        <div className="w-full bg-dark-subtle h-1.5 rounded-full overflow-hidden">
          <div className="bg-brand-blue h-full w-2/3 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. Active repository card
  if (!activeRepo) return null;

  const repo = repoDetails || activeRepo;
  const skipped = repo.skipped || {};
  const totalSkipped = Object.values(skipped).reduce((acc, v) => acc + (Number(v) || 0), 0);

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface p-3.5 space-y-3 text-xs">
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4
              className="font-semibold text-dark-bright truncate font-mono text-xs"
              title={repo.name}
            >
              {repo.name}
            </h4>
          </div>
          {/* Repo ID */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-dark-muted">
            <Hash className="w-3 h-3 text-dark-muted/60" />
            <span className="truncate">{repo.repo_id}</span>
          </div>
        </div>
        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-medium shrink-0">
          INDEXED
        </span>
      </div>

      {/* Stats row: indexed files & chunks */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dark-border/60">
        <div className="p-2 rounded bg-[#0d1117] border border-dark-border/50 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-brand-blue shrink-0" />
          <div>
            <div className="text-[10px] text-dark-muted">Files</div>
            <div className="font-mono font-bold text-dark-bright text-xs">
              {formatNumber(repo.indexed_files)}
            </div>
          </div>
        </div>

        <div className="p-2 rounded bg-[#0d1117] border border-dark-border/50 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div className="text-[10px] text-dark-muted">Chunks</div>
            <div className="font-mono font-bold text-dark-bright text-xs">
              {formatNumber(repo.indexed_chunks)}
            </div>
          </div>
        </div>
      </div>

      {/* Language breakdown chips */}
      {repo.languages && Object.keys(repo.languages).length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-medium text-dark-muted uppercase tracking-wider block">
            Languages
          </span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(repo.languages).map(([lang, count]) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-dark-subtle text-dark-text border border-dark-border/60"
              >
                <span>{lang}</span>
                <span className="text-dark-muted text-[10px]">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skipped files dropdown count */}
      {totalSkipped > 0 && (
        <div className="pt-1 border-t border-dark-border/60">
          <button
            type="button"
            onClick={() => setShowSkipped(!showSkipped)}
            className="flex items-center justify-between w-full text-[11px] text-dark-muted hover:text-dark-bright transition-colors"
          >
            <span>{totalSkipped} non-code files skipped</span>
            {showSkipped ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showSkipped && (
            <div className="mt-2 p-2 rounded bg-[#0d1117] border border-dark-border/40 space-y-1 text-[10px] font-mono text-dark-muted">
              {Object.entries(skipped).map(([reason, count]) => {
                if (count === 0) return null;
                return (
                  <div key={reason} className="flex justify-between">
                    <span className="capitalize">{reason.replace('_', ' ')}:</span>
                    <span className="text-dark-text font-bold">{count}</span>
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

