import React, { useState } from 'react';
import { UploadZip } from './UploadZip';
import { GithubForm } from './GithubForm';
import { IndexStatus } from './IndexStatus';
import {
  FolderArchive,
  Github,
  Database,
  ChevronDown,
  ChevronRight,
  Layers,
  History,
  Check,
} from 'lucide-react';

export function RepoPanel({
  onUploadZip,
  onIndexGithub,
  isIndexing,
  indexingStep,
  activeRepo,
  repoDetails,
  sessionRepos = [],
  onSelectRepo,
}) {
  const [activeTab, setActiveTab] = useState('zip'); // 'zip' | 'github'
  const [mobileOpen, setMobileOpen] = useState(true);

  return (
    <aside
      className="w-full lg:w-80 shrink-0 bg-dark-surface/90 border-b lg:border-b-0 lg:border-r border-dark-border flex flex-col"
      aria-label="Repository Source Panel"
    >
      {/* Mobile collapse header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-dark-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark-bright">
          <Database className="w-4 h-4 text-brand-blue" />
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
          className="p-1 rounded text-dark-muted hover:text-white"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Collapse source panel' : 'Expand source panel'}
        >
          {mobileOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <div className={`p-4 space-y-5 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
        {/* Panel header for desktop */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-dark-muted">
            <Database className="w-3.5 h-3.5 text-brand-blue" />
            <span>Repository Index</span>
          </div>
          {sessionRepos.length > 0 && (
            <span className="text-[11px] font-mono text-dark-muted">
              {sessionRepos.length} indexed
            </span>
          )}
        </div>

        {/* Source selection tabs */}
        <div className="flex rounded-md bg-[#0d1117] p-1 border border-dark-border" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zip'}
            onClick={() => setActiveTab('zip')}
            disabled={isIndexing}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition-all ${
              activeTab === 'zip'
                ? 'bg-dark-subtle text-dark-bright shadow-sm border border-dark-border'
                : 'text-dark-muted hover:text-dark-bright'
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
                ? 'bg-dark-subtle text-dark-bright shadow-sm border border-dark-border'
                : 'text-dark-muted hover:text-dark-bright'
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

        {/* Session indexed repositories switcher */}
        {sessionRepos.length > 0 && (
          <div className="pt-2 border-t border-dark-border/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-dark-muted">
              <History className="w-3.5 h-3.5" />
              <span>Session Repositories</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
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
                        ? 'bg-brand-blue/10 border-brand-blue/40 text-brand-hover font-semibold'
                        : 'bg-[#0d1117]/60 border-dark-border/40 text-dark-muted hover:text-dark-bright hover:bg-dark-subtle'
                    }`}
                  >
                    <span className="truncate">{repo.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-dark-muted">
                        {repo.indexed_files}f
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-brand-blue" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

