import React, { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react';

export function SessionHistory({
  activeRepo,
  searchHistory = [],
  currentQuery = '',
  onSelectHistory,
  onRemoveHistoryItem,
  onClearHistory,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter history: prioritize current active repo, or all if none
  const repoHistory = activeRepo
    ? searchHistory.filter((item) => item.repo_id === activeRepo.repo_id)
    : searchHistory;

  return (
    <div className="pt-2 border-t border-cream-darker/60 space-y-2">
      {/* Header with History Dropdown Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Clock className="w-3.5 h-3.5 text-brand-burg" />
          <span>Session History</span>
        </div>

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all shadow-2xs border ${
            isOpen
              ? 'bg-brand-burg text-cream border-brand-burg'
              : 'bg-cream hover:bg-cream-dark text-brand-burg border-cream-darker'
          }`}
          aria-expanded={isOpen}
          title="Open session search history"
        >
          <MessageSquare className="w-3 h-3" />
          <span>History</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isOpen ? 'bg-cream/20 text-cream' : 'bg-brand-burg/10 text-brand-burg'
            }`}
          >
            {repoHistory.length}
          </span>
          {isOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Claude-chats Style Search History Dropdown List */}
      {isOpen && (
        <div className="rounded-xl border border-cream-darker bg-cream-warm p-2.5 shadow-sm space-y-2 animate-fadeIn text-xs">
          {/* Top subheader */}
          <div className="flex items-center justify-between text-[11px] text-ink-muted px-1 pb-1 border-b border-cream-darker/70">
            <span className="font-medium">
              {activeRepo ? `Searches in ${activeRepo.name}` : 'All Searches'}
            </span>
            {repoHistory.length > 0 && (
              <button
                type="button"
                onClick={() => onClearHistory && onClearHistory(activeRepo?.repo_id)}
                className="text-[10px] text-danger/80 hover:text-danger hover:underline transition-colors"
                title="Clear history for this repository"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Chat items list */}
          {repoHistory.length === 0 ? (
            <div className="py-5 px-3 text-center space-y-1.5 text-ink-muted">
              <Search className="w-5 h-5 mx-auto text-ink-faint/60" />
              <p className="text-[11px]">No previous searches in this session.</p>
              <p className="text-[10px] text-ink-faint">
                Queries you execute will be saved here like Claude chats.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {repoHistory.map((item) => {
                const isActive =
                  currentQuery &&
                  item.query.toLowerCase() === currentQuery.toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-lg border p-2 transition-all cursor-pointer flex flex-col space-y-1 ${
                      isActive
                        ? 'bg-cream border-brand-burg shadow-2xs'
                        : 'bg-cream hover:bg-cream-dark/60 border-cream-darker hover:border-brand-burg/40'
                    }`}
                    onClick={() => onSelectHistory && onSelectHistory(item)}
                    role="button"
                    tabIndex={0}
                    title={`Restore search: "${item.query}"`}
                  >
                    {/* Query title + delete button */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-brand-burg shrink-0 mt-0.5" />
                        <span
                          className={`font-sans text-xs font-medium truncate leading-tight ${
                            isActive ? 'text-brand-burg font-semibold' : 'text-ink'
                          }`}
                        >
                          {item.query}
                        </span>
                      </div>

                      {/* Delete item button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistoryItem && onRemoveHistoryItem(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ink-faint hover:text-danger hover:bg-cream-darker transition-all"
                        title="Delete from history"
                        aria-label="Delete history item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Metadata line: Timestamp + Snippets count */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted pl-5">
                      <span>{item.formattedTime || 'Earlier'}</span>
                      <div className="flex items-center gap-1.5">
                        {item.explain && (
                          <span className="flex items-center gap-0.5 text-brand-burg text-[9px]">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI</span>
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-cream-darker text-ink text-[10px]">
                          {item.result_count !== undefined
                            ? `${item.result_count} snippets`
                            : `${item.top_k || 5} top_k`}
                        </span>
                      </div>
                    </div>
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

