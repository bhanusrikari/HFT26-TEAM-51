import React, { useState } from 'react';
import { UploadZip } from './UploadZip';
import { GithubForm } from './GithubForm';
import { IndexStatus } from './IndexStatus';
import RepoOverview from './RepoOverview';
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
  onSelectHistoryQuery,
}) {
  const [activeTab, setActiveTab] = useState('zip');
  const [mobileOpen, setMobileOpen] = useState(true);

  return (
    <aside
      className="w-full lg:w-80 shrink-0 bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col"
      aria-label="Repository Source Panel"
    >
      {/* Mobile collapse header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Repository Source</span>
          {activeRepo && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 ml-1 truncate max-w-[150px]">
              {activeRepo.name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 rounded text-slate-400 hover:text-white"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Collapse source panel' : 'Expand source panel'}
        >
          {mobileOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <div className={`p-4 space-y-5 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
        {/* Panel header for desktop */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Repository Index</span>
          </div>
          {sessionRepos.length > 0 && (
            <span className="text-[11px] font-mono text-slate-500">
              {sessionRepos.length} repos
            </span>
          )}
        </div>

        {/* Source selection tabs */}
        <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zip'}
            onClick={() => setActiveTab('zip')}
            disabled={isIndexing}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-all ${
              activeTab === 'zip'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-all ${
              activeTab === 'github'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            } disabled:opacity-50`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </button>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'zip' ? (
            <UploadZip onUpload={onUploadZip} isIndexing={isIndexing} />
          ) : (
            <GithubForm onIndex={onIndexGithub} isIndexing={isIndexing} />
          )}
        </div>

        {/* Current indexing progress or active repo details */}
        <IndexStatus
          isIndexing={isIndexing}
          indexingStep={indexingStep}
          activeRepo={activeRepo}
          repoDetails={repoDetails}
        />

        {/* Repo Overview Card */}
        {activeRepo && repoDetails && repoDetails.status === 'ready' && (
          <RepoOverview repo={repoDetails} />
        )}

        {/* User's indexed repositories */}
        {sessionRepos.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Database className="w-3.5 h-3.5" />
              <span>Your Repositories</span>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {sessionRepos.map((repo) => {
                const isSelected = activeRepo?.repo_id === repo.repo_id;
                return (
                  <button
                    key={repo.repo_id}
                    type="button"
                    onClick={() => onSelectRepo(repo.repo_id)}
                    disabled={isIndexing}
                    className={`w-full text-left p-2 rounded-md text-xs font-mono flex items-center justify-between gap-2 border transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <span className="truncate">{repo.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {repo.indexed_files && (
                        <span className="text-[10px] text-slate-500">
                          {repo.indexed_files}f
                        </span>
                      )}
                      {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search history for active repo */}
        {searchHistory && searchHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <History className="w-3.5 h-3.5" />
              <span>Search History</span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {searchHistory.slice(0, 10).map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => onSelectHistoryQuery && onSelectHistoryQuery(item.query)}
                  className="w-full text-left p-1.5 rounded text-[11px] font-mono text-slate-300 hover:text-white bg-slate-950/40 hover:bg-slate-800 border border-slate-800/60 truncate flex items-center gap-1.5 transition-colors"
                  title={`Run query: ${item.query}`}
                >
                  <Search className="w-3 h-3 text-slate-500 shrink-0" />
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
