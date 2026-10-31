import React from 'react';
import { formatScore } from '../lib/format';

export function ScoreBar({ score }) {
  const { scoreStr, percent } = formatScore(score);

  // Dynamic bar coloring based on relevance tier — using burgundy gradient
  let barStyle;
  if (percent >= 85) {
    barStyle = { background: 'linear-gradient(90deg, #6B1A2A 0%, #8B2A3C 100%)' };
  } else if (percent >= 70) {
    barStyle = { background: 'linear-gradient(90deg, #8B2A3C 0%, #B8860B 100%)' };
  } else {
    barStyle = { background: 'linear-gradient(90deg, #B8860B 0%, #C4A882 100%)' };
  }

  return (
    <div className="flex items-center gap-2" title={`Relevance score: ${scoreStr} (${percent}%)`}>
      <span className="text-xs font-mono font-semibold text-ink">
        {scoreStr}
      </span>
      <div className="w-16 h-2 bg-cream-darker rounded-full overflow-hidden border border-cream-darker/60">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, ...barStyle }}
        />
      </div>
      <span className="text-[11px] font-mono text-ink-muted hidden sm:inline">
        {percent}%
      </span>
    </div>
  );
}
