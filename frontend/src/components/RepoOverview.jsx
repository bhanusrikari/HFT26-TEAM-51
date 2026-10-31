import React from 'react';
import { Folder, FileCode, CheckCircle2 } from 'lucide-react';

export default function RepoOverview({ repo }) {
  if (!repo) return null;

  const languages = repo.languages || {};
  const totalLangCount = Object.values(languages).reduce((a, b) => a + b, 0) || 1;

  // Sorted languages by count
  const sortedLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-lg border border-cream-darker bg-cream-warm p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
          <FileCode className="h-3.5 w-3.5 text-brand-burg" />
          Repository Overview
        </span>
        <span className="text-[11px] font-mono text-brand-burg bg-brand-burg/5 px-1.5 py-0.5 rounded border border-brand-burg/20">
          Ready
        </span>
      </div>

      {/* Language Breakdown Bar */}
      <div>
        <div className="flex justify-between text-[11px] text-ink-muted mb-1">
          <span>Languages</span>
          <span>{repo.indexed_files || 0} files</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark flex">
          {sortedLangs.map(([lang, count], i) => {
            const pct = Math.round((count / totalLangCount) * 100);
            const colors = [
              'bg-brand-burg',
              'bg-brand-burgLight',
              'bg-brand-gold',
              'bg-ink-muted',
              'bg-ink-faint',
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
              <span key={lang} className="text-[11px] text-ink bg-cream-dark px-2 py-0.5 rounded font-mono">
                {lang} <span className="text-ink-muted">({pct}%)</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Chunks & Skip Info */}
      <div className="pt-2 border-t border-cream-darker flex items-center justify-between text-[11px] text-ink-muted">
        <span>Indexed chunks: <strong className="text-ink">{repo.indexed_chunks || 0}</strong></span>
        {repo.skipped && (
          <span>Excluded: <strong className="text-ink">{Object.values(repo.skipped).reduce((a, b) => a + b, 0)}</strong></span>
        )}
      </div>
    </div>
  );
}
