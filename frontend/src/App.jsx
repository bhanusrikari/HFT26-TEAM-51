import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { RepoPanel } from './components/RepoPanel';
import { SearchBar } from './components/SearchBar';
import { ExplanationPanel } from './components/ExplanationPanel';
import { ResultsList } from './components/ResultsList';
import {
  InitialState,
  ZeroResultsState,
  ResultsSkeleton,
  ErrorBanner,
} from './components/States';
import {
  uploadZip,
  indexGithub,
  getRepository,
  searchCode,
  getInitialMockRepos,
  isMockEnabled,
} from './api/client';

export default function App() {
  // Active repository state
  const [activeRepo, setActiveRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [sessionRepos, setSessionRepos] = useState([]);

  // Indexing status
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStep, setIndexingStep] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Initialize with mock repositories if in mock mode for instant exploration
  useEffect(() => {
    if (isMockEnabled()) {
      const initial = getInitialMockRepos();
      setSessionRepos(initial);
      if (initial.length > 0) {
        selectRepo(initial[0].repo_id, initial[0]);
      }
    }
  }, []);

  // Select active repository and load its detailed stats (languages & skipped breakdown)
  const selectRepo = async (repoId, fallbackRepo = null) => {
    setSearchError(null);
    setSearchResponse(null);
    setSearchQuery('');

    const existing = sessionRepos.find((r) => r.repo_id === repoId) || fallbackRepo;
    if (existing) {
      setActiveRepo(existing);
    }

    try {
      const details = await getRepository(repoId);
      setRepoDetails(details);
      setActiveRepo(details);
    } catch (err) {
      console.warn('Failed to load detailed repo stats:', err);
      if (existing) {
        setRepoDetails(existing);
      } else {
        setSearchError(err);
      }
    }
  };

  // 1. Handle Upload ZIP
  const handleUploadZip = async (file) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Uploading…');

    const stepTimer = setTimeout(() => {
      setIndexingStep('Indexing…');
    }, 500);

    try {
      const res = await uploadZip(file);
      setSessionRepos((prev) => [res, ...prev.filter((r) => r.repo_id !== res.repo_id)]);
      await selectRepo(res.repo_id, res);
    } catch (err) {
      setSearchError(err);
    } finally {
      clearTimeout(stepTimer);
      setIsIndexing(false);
      setIndexingStep('');
    }
  };

  // 2. Handle GitHub Indexing
  const handleIndexGithub = async (url) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Indexing…');

    try {
      const res = await indexGithub(url);
      setSessionRepos((prev) => [res, ...prev.filter((r) => r.repo_id !== res.repo_id)]);
      await selectRepo(res.repo_id, res);
    } catch (err) {
      setSearchError(err);
    } finally {
      setIsIndexing(false);
      setIndexingStep('');
    }
  };

  // 3. Handle Search
  const handleSearch = async ({ query, top_k, explain }) => {
    if (!activeRepo) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);
    setSearchParams({ query, top_k, explain });

    try {
      const response = await searchCode({
        repo_id: activeRepo.repo_id,
        query,
        top_k,
        explain,
      });
      setSearchResponse(response);
    } catch (err) {
      setSearchError(err);
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Citation click handler: jump smoothly to result card and pulse highlight
  const handleCitationClick = (citationNumber) => {
    const cardEl = document.getElementById(`result-card-${citationNumber}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.remove('citation-highlight');
      // Trigger reflow to restart CSS animation
      void cardEl.offsetWidth;
      cardEl.classList.add('citation-highlight');
      cardEl.focus();
    }
  };

  // 5. Retry current failed search
  const handleRetrySearch = () => {
    if (searchParams) {
      handleSearch(searchParams);
    }
  };

  const is404Error = searchError?.status === 404;

  return (
    <div className="min-h-screen bg-[#0d1117] text-dark-text flex flex-col font-sans selection:bg-brand-blue/30 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main layout: Sidebar + Central Search & Results */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar: Repository Source & Session Index list */}
        <RepoPanel
          onUploadZip={handleUploadZip}
          onIndexGithub={handleIndexGithub}
          isIndexing={isIndexing}
          indexingStep={indexingStep}
          activeRepo={activeRepo}
          repoDetails={repoDetails}
          sessionRepos={sessionRepos}
          onSelectRepo={(id) => selectRepo(id)}
        />

        {/* Central Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0" role="main">
          {/* Search bar & query chips */}
          <SearchBar
            onSearch={handleSearch}
            isSearching={isSearching}
            hasActiveRepo={!!activeRepo}
            activeRepoName={activeRepo?.name}
            sampleQueries={repoDetails?.sampleQueries || activeRepo?.sampleQueries || []}
            externalQuery={searchQuery}
          />

          {/* Error Banner with Retry */}
          {searchError && (
            <ErrorBanner
              error={searchError}
              onRetry={searchParams ? handleRetrySearch : null}
              is404={is404Error}
              onReindex={() => {
                setActiveRepo(null);
                setSearchError(null);
              }}
            />
          )}

          {/* AI Explanation Panel (above the retrieved snippets) */}
          <ExplanationPanel
            explanation={searchResponse?.explanation}
            explanationError={searchResponse?.explanation_error}
            isLoading={isSearching}
            onCitationClick={handleCitationClick}
          />

          {/* Results display area */}
          {isSearching ? (
            <ResultsSkeleton count={searchParams?.top_k || 3} />
          ) : searchResponse ? (
            searchResponse.results && searchResponse.results.length > 0 ? (
              <ResultsList
                query={searchResponse.query}
                results={searchResponse.results}
                resultCount={searchResponse.result_count}
              />
            ) : (
              <ZeroResultsState
                query={searchResponse.query}
                onClear={() => setSearchResponse(null)}
              />
            )
          ) : (
            <InitialState
              repoName={activeRepo?.name}
              sampleQueries={repoDetails?.sampleQueries || activeRepo?.sampleQueries || []}
              onSampleClick={(q) => {
                setSearchQuery(q);
                handleSearch({
                  query: q,
                  top_k: 5,
                  explain: true,
                });
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

