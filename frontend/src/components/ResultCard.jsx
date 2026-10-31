import React from 'react';
import { KindBadge, LanguageBadge, MatchReasonChip } from './Badge';
import { ScoreBar } from './ScoreBar';
import { CodeViewer } from './CodeViewer';
import { formatLineRange } from '../lib/format';
import { FileCode, Tag, ExternalLink } from 'lucide-react';

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
      className="group relative rounded-xl border border-cream-darker bg-cream-warm p-4 sm:p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-brand-burg/50 transition-all duration-300 focus-within:border-brand-burg animate-fadeIn"
      tabIndex={0}
      aria-label={`Result #${rank}: ${symbol || file_path}`}
    >
      {/* Subtle glowing card top hairline on hover */}
      <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-brand-burg/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t" />

      {/* Top row: Rank, File path, Line range, Language */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg font-mono text-xs font-bold border shadow-2xs group-hover:scale-105 group-hover:border-brand-burg/40 transition-all duration-200"
            style={{ background: '#F0E8DC', borderColor: '#E4D5C4', color: '#1C0A0D' }}
            title={`Rank #${rank}`}
          >
            #{rank}
          </span>
          <div className="flex items-center gap-1.5 truncate">
            <FileCode className="w-4 h-4 text-brand-burg shrink-0 group-hover:rotate-6 transition-transform duration-200" />
            <span
              className="font-mono text-sm font-semibold text-ink truncate group-hover:text-brand-burg transition-colors cursor-pointer"
              title={file_path}
            >
              {file_path}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-ink-muted bg-cream px-2 py-0.5 rounded border border-cream-darker">
            {formatLineRange(start_line, end_line)}
          </span>
          <LanguageBadge language={language} />
        </div>
      </div>

      {/* Second row: Symbol, Kind badge, Match reasons, Relevance score */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-cream-darker/70">
        <div className="flex flex-wrap items-center gap-2">
          {symbol && (
            <div className="flex items-center gap-1.5 bg-cream px-2.5 py-0.5 rounded-md border border-cream-darker shadow-2xs group-hover:border-brand-burg/30 transition-colors">
              <Tag className="w-3 h-3 text-brand-burg" />
              <span className="font-mono text-xs font-semibold text-brand-burg">
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
