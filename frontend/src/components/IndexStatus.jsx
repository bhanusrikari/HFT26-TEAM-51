import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  FileCode2,
  Layers,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatNumber } from '../lib/format';

export function IndexStatus({
  isIndexing,
  indexingStep = 'Uploading…',
  activeRepo,
  repoDetails,
}) {
  const [showSkipped, setShowSkipped] = useState(false);

  // Active status check
  const repo = repoDetails || activeRepo;
  const isPending = isIndexing || (repo && (repo.status === 'queued' || repo.status === 'cloning' || repo.status === 'parsing' || repo.status === 'embedding'));
  const isFailed = repo && repo.status === 'failed';

  if (isPending) {
    const stageName = repo?.status
      ? repo.status === 'cloning'
        ? 'Cloning repository…'
        : repo.status === 'parsing'
        ? 'Parsing files & AST…'
        : repo.status === 'embedding'
        ? 'Generating embeddings…'
        : 'Queued for indexing…'
      : (indexingStep || 'Uploading…');

    const progressPct = repo?.progress ? Math.round(repo.progress * 100) : 45;

    return (
      <div
        className="rounded-lg border border-indigo-500/40 bg-indigo-500/5 p-4 space-y-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-indigo-300 block">
              {stageName}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono">
              Stage: {repo?.status || 'indexing'} ({progressPct}%)
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(10, progressPct)}%` }}
          />
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-950/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-red-400 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Repository Indexing Failed</span>
        </div>
        <p className="text-slate-300 font-mono text-[11px]">
          {repo.error || 'Failed to index repository'}
        </p>
      </div>
    );
  }

  if (!repo) return null;

  const skipped = repo.skipped || {};
  const totalSkipped = Object.values(skipped).reduce((acc, v) => acc + (Number(v) || 0), 0);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3.5 space-y-3 text-xs">
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4
              className="font-semibold text-slate-100 truncate font-mono text-xs"
              title={repo.name}
            >
              {repo.name}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Hash className="w-3 h-3 text-slate-500" />
            <span className="truncate">{repo.repo_id}</span>
          </div>
        </div>
        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-medium shrink-0">
          READY
        </span>
      </div>

      {/* Stats row: indexed files & chunks */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
        <div className="p-2 rounded bg-slate-800/60 border border-slate-700/50 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400">Files</div>
            <div className="font-mono font-bold text-slate-100 text-xs">
              {formatNumber(repo.indexed_files)}
            </div>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-800/60 border border-slate-700/50 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400">Chunks</div>
            <div className="font-mono font-bold text-slate-100 text-xs">
              {formatNumber(repo.indexed_chunks)}
            </div>
          </div>
        </div>
      </div>

      {/* Language breakdown chips */}
      {repo.languages && Object.keys(repo.languages).length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Languages
          </span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(repo.languages).map(([lang, count]) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-200 border border-slate-700"
              >
                <span>{lang}</span>
                <span className="text-slate-400 text-[10px]">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skipped files dropdown */}
      {totalSkipped > 0 && (
        <div className="pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowSkipped(!showSkipped)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{totalSkipped} non-code files skipped</span>
            {showSkipped ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showSkipped && (
            <div className="mt-2 p-2 rounded bg-slate-800/40 border border-slate-700/40 space-y-1 text-[10px] font-mono text-slate-400">
              {Object.entries(skipped).map(([reason, count]) => {
                if (count === 0) return null;
                return (
                  <div key={reason} className="flex justify-between">
                    <span className="capitalize">{reason.replace('_', ' ')}:</span>
                    <span className="text-slate-200 font-bold">{count}</span>
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
