import React from 'react';
import { KindBadge, LanguageBadge, MatchReasonChip } from './Badge';
import { ScoreBar } from './ScoreBar';
import { CodeViewer } from './CodeViewer';
import { formatLineRange } from '../lib/format';
import { FileCode, Tag } from 'lucide-react';

export function ResultCard({
  result,
  rank,
  defaultExpanded = false,
}) {
  const {
    file_path,
    symbol,
    kind,
    language,
    start_line,
    end_line,
    score,
    code,
    match_reasons = [],
  } = result;

  const cardId = `result-card-${rank}`;

  return (
    <article
      id={cardId}
      className="rounded-lg border border-dark-border bg-dark-surface p-4 shadow-sm hover:border-dark-muted/50 transition-all duration-200 focus-within:border-brand-blue"
      tabIndex={0}
      aria-label={`Result #${rank}: ${symbol || file_path}`}
    >
      {/* Top row: Rank, File path, Line range, Language */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-dark-subtle text-dark-bright font-mono text-xs font-bold border border-dark-border"
            title={`Rank #${rank}`}
          >
            #{rank}
          </span>
          <div className="flex items-center gap-1.5 truncate">
            <FileCode className="w-4 h-4 text-brand-blue shrink-0" />
            <span
              className="font-mono text-sm font-semibold text-dark-bright truncate hover:text-brand-hover"
              title={file_path}
            >
              {file_path}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-dark-muted">
            {formatLineRange(start_line, end_line)}
          </span>
          <LanguageBadge language={language} />
        </div>
      </div>

      {/* Second row: Symbol, Kind badge, Match reasons, Relevance score */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-dark-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {symbol && (
            <div className="flex items-center gap-1.5 bg-[#0d1117] px-2 py-0.5 rounded border border-dark-border/80">
              <Tag className="w-3 h-3 text-purple-400" />
              <span className="font-mono text-xs font-medium text-purple-200">
                {symbol}
              </span>
            </div>
          )}
          <KindBadge kind={kind} />

          {/* Match reasons */}
          {match_reasons && match_reasons.length > 0 && (
            <div className="flex items-center gap-1 ml-1" title="Match reasons">
              {match_reasons.map((reason, idx) => (
                <MatchReasonChip key={idx} reason={reason} />
              ))}
            </div>
          )}
        </div>

        {/* Relevance score bar */}
        <div className="shrink-0">
          <ScoreBar score={score} />
        </div>
      </div>

      {/* Code viewer with syntax highlighting and copy controls */}
      <CodeViewer
        code={code}
        language={language}
        startLine={start_line}
        endLine={end_line}
        filePath={file_path}
        defaultExpanded={defaultExpanded}
      />
    </article>
  );
}

