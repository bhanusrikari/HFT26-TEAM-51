import React, { useState } from 'react';
import { UploadZip } from './UploadZip';
import { GithubForm } from './GithubForm';
import { IndexStatus } from './IndexStatus';
import { SearchQualityMetrics } from './SearchQualityMetrics';
import { SessionHistory } from './SessionHistory';
import {
  FolderArchive,
  Github,
  Database,
  ChevronDown,
  ChevronRight,
  History,
  Check,
  Search,
} from 'lucide-react';

export function RepoPanel({
  onUploadZip,
  onIndexGithub,
  isIndexing,
  indexingStep,
  activeRepo,
  repoDetails,
  sessionRepos = [],
  searchHistory = [],
  onSelectRepo,
  currentQuery = '',
  onSelectHistory,
  onRemoveHistoryItem,
  onClearHistory,
}) {
  const [activeTab, setActiveTab] = useState('zip');
  const [mobileOpen, setMobileOpen] = useState(true);

  return (
    <aside
      className="w-full lg:w-80 shrink-0 bg-cream-dark/90 border-b lg:border-b-0 lg:border-r border-cream-darker flex flex-col"
      aria-label="Repository Source Panel"
    >
      {/* Mobile Collapse Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-cream-darker">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Database className="w-4 h-4 text-brand-burg" />
          <span>Repository Source</span>

          {activeRepo && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-burg/5 text-brand-burg border border-brand-burg/20 ml-1 truncate max-w-[150px]">
              {activeRepo.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 rounded text-ink-muted hover:text-ink"
          aria-expanded={mobileOpen}
          aria-label={
            mobileOpen ? 'Collapse source panel' : 'Expand source panel'
          }
        >
          {mobileOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      <div
        className={`p-4 space-y-5 ${
          mobileOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        {/* Desktop Panel Header */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Database className="w-3.5 h-3.5 text-brand-burg" />
            <span>Repository Index</span>
          </div>

          {sessionRepos.length > 0 && (
            <span className="text-[11px] font-mono text-ink-muted bg-cream px-1.5 py-0.5 rounded border border-cream-darker">
              {sessionRepos.length} indexed
            </span>
          )}
        </div>

        {/* Source Selection Tabs */}
        <div
          className="flex rounded-lg bg-cream p-1 border border-cream-darker shadow-2xs"
          role="tablist"
          aria-label="Repository source"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zip'}
            onClick={() => setActiveTab('zip')}
            disabled={isIndexing}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'zip'
                ? 'bg-brand-burg text-cream shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-cream-dark/60'
            } disabled:opacity-50`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Upload ZIP</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'github'}
            onClick={() => setActiveTab('github')}
            disabled={isIndexing}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'github'
                ? 'bg-brand-burg text-cream shadow-sm'
                : 'text-ink-muted hover:text-ink hover:bg-cream-dark/60'
            } disabled:opacity-50`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'zip' ? (
            <UploadZip
              onUpload={onUploadZip}
              isIndexing={isIndexing}
            />
          ) : (
            <GithubForm
              onIndex={onIndexGithub}
              isIndexing={isIndexing}
            />
          )}
        </div>

        {/* Current Indexing Progress or Active Repo Details */}
        <IndexStatus
          isIndexing={isIndexing}
          indexingStep={indexingStep}
          activeRepo={activeRepo}
          repoDetails={repoDetails}
        />

        <SearchQualityMetrics />

        {/* Session Search History (Claude Chats Style Dropdown) */}
        <SessionHistory
          activeRepo={activeRepo}
          searchHistory={searchHistory}
          currentQuery={currentQuery}
          onSelectHistory={onSelectHistory}
          onRemoveHistoryItem={onRemoveHistoryItem}
          onClearHistory={onClearHistory}
        />

        {/* Session indexed repositories switcher */}
        {sessionRepos.length > 0 && (
          <div className="pt-2 border-t border-cream-darker/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
              <History className="w-3.5 h-3.5 text-brand-burg" />
              <span>Session Repositories</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {sessionRepos.map((repo) => {
                const isSelected =
                  activeRepo?.repo_id === repo.repo_id;

                return (
                  <button
                    key={repo.repo_id}
                    type="button"
                    onClick={() => onSelectRepo(repo.repo_id)}
                    disabled={isIndexing}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-mono flex items-center justify-between gap-2 border transition-all duration-150 ${
                      isSelected
                        ? 'bg-cream border-l-3 border-brand-burg text-ink font-semibold shadow-xs'
                        : 'bg-cream hover:bg-cream-darker/60 border-cream-darker text-ink-muted hover:text-ink hover:translate-x-0.5'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{repo.name}</span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {repo.indexed_files != null && (
                        <span className="text-[10px] text-ink-faint">
                          {repo.indexed_files}f
                        </span>
                      )}

                      {isSelected && (
                        <Check className="w-3 h-3 text-brand-burg" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search History */}
        {searchHistory && searchHistory.length > 0 && (
          <div className="pt-2 border-t border-cream-darker/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <History className="w-3.5 h-3.5 text-brand-burg" />
              <span>Search History</span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {searchHistory.slice(0, 10).map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() =>
                    onSelectHistoryQuery &&
                    onSelectHistoryQuery(item.query)
                  }
                  className="w-full text-left p-1.5 rounded text-[11px] font-mono text-ink-muted hover:text-ink bg-cream hover:bg-cream-dark border border-cream-darker truncate flex items-center gap-1.5 transition-colors"
                  title={`Run query: ${item.query}`}
                >
                  <Search className="w-3 h-3 text-brand-burg shrink-0" />
                  <span className="truncate">{item.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}