import React from 'react';
import { formatScore } from '../lib/format';

export function ScoreBar({ score }) {
  const { scoreStr, percent } = formatScore(score);

  // Dynamic bar coloring based on relevance tier
  let barColor = 'bg-brand-blue';
  if (percent >= 85) {
    barColor = 'bg-emerald-500';
  } else if (percent >= 70) {
    barColor = 'bg-brand-blue';
  } else {
    barColor = 'bg-amber-500';
  }

  return (
    <div className="flex items-center gap-2" title={`Relevance score: ${scoreStr} (${percent}%)`}>
      <span className="text-xs font-mono font-semibold text-dark-bright">
        {scoreStr}
      </span>
      <div className="w-16 h-2 bg-dark-subtle rounded-full overflow-hidden border border-dark-border/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-dark-muted hidden sm:inline">
        {percent}%
      </span>
    </div>
  );
}

