import React from 'react';
import { Folder, FileCode, CheckCircle2 } from 'lucide-react';

export default function RepoOverview({ repo }) {
  if (!repo) return null;

  const languages = repo.languages || {};
  const totalLangCount = Object.values(languages).reduce((a, b) => a + b, 0) || 1;

  // Sorted languages by count
  const sortedLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileCode className="h-3.5 w-3.5 text-indigo-400" />
          Repository Overview
        </span>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          Ready
        </span>
      </div>

      {/* Language Breakdown Bar */}
      <div>
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>Languages</span>
          <span>{repo.indexed_files || 0} files</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 flex">
          {sortedLangs.map(([lang, count], i) => {
            const pct = Math.round((count / totalLangCount) * 100);
            const colors = [
              'bg-indigo-500',
              'bg-cyan-500',
              'bg-emerald-500',
              'bg-amber-500',
              'bg-purple-500',
            ];
            return (
              <div
                key={lang}
                title={`${lang}: ${count} (${pct}%)`}
                className={`h-full ${colors[i % colors.length]}`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {sortedLangs.slice(0, 4).map(([lang, count]) => {
            const pct = Math.round((count / totalLangCount) * 100);
            return (
              <span key={lang} className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-mono">
                {lang} <span className="text-slate-400">({pct}%)</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Chunks & Skip Info */}
      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Indexed chunks: <strong className="text-slate-200">{repo.indexed_chunks || 0}</strong></span>
        {repo.skipped && (
          <span>Excluded: <strong className="text-slate-300">{Object.values(repo.skipped).reduce((a, b) => a + b, 0)}</strong></span>
        )}
      </div>
    </div>
  );
}
