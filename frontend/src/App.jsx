import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RepoPanel } from './components/RepoPanel';
import { SearchBar } from './components/SearchBar';
import { ExplanationPanel } from './components/ExplanationPanel';
import { ResultsList } from './components/ResultsList';
import { IndexingOverlay } from './components/IndexingOverlay';
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
} from './api/client';
import { useSession } from './auth/useSession';
import { LoginPage } from './auth/LoginPage';

export default function App() {
  const {
    user,
    sessionRepos,
    searchHistory,
    login,
    logout,
    addRepo,
    addSearchHistory,
    removeSearchHistoryItem,
    clearSearchHistory,
  } = useSession();

  // Active repository state
  const [activeRepo, setActiveRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);

  // Indexing status
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStep, setIndexingStep] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Subtle interactive cursor spotlight
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    setIndexingStep('Uploading archive…');

    try {
      // Step transitions for visual pipeline
      setTimeout(() => setIndexingStep('Unpacking & indexing files…'), 500);
      setTimeout(() => setIndexingStep('Extracting AST chunk symbols…'), 1100);

      const res = await uploadZip(file);
      addRepo(res);
      await selectRepo(res.repo_id, res);
    } catch (err) {
      setSearchError(err);
    } finally {
      setIsIndexing(false);
      setIndexingStep('');
    }
  };

  // 2. Handle GitHub Indexing
  const handleIndexGithub = async (url) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Connecting to GitHub…');

    try {
      setTimeout(() => setIndexingStep('Cloning tree & reading manifests…'), 500);
      setTimeout(() => setIndexingStep('Chunking symbols and indexing…'), 1100);

      const res = await indexGithub(url);
      addRepo(res);
      await selectRepo(res.repo_id, res);
    } catch (err) {
      setSearchError(err);
    } finally {
      setIsIndexing(false);
      setIndexingStep('');
    }
  };

  // 3. Handle Search & record in session history
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

      // Save to Claude-style search history per session
      addSearchHistory({
        repo_id: activeRepo.repo_id,
        repo_name: activeRepo.name,
        query,
        top_k,
        explain,
        result_count:
          response.result_count !== undefined
            ? response.result_count
            : response.results?.length || 0,
        response,
      });
    } catch (err) {
      setSearchError(err);
      setSearchResponse(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Restore history search item instantly
  const handleSelectHistory = async (item) => {
    if (activeRepo?.repo_id !== item.repo_id) {
      await selectRepo(item.repo_id);
    }
    setSearchQuery(item.query);
    setSearchParams({ query: item.query, top_k: item.top_k, explain: item.explain });

    // Instantly restore cached response if present, or re-run
    if (item.response) {
      setSearchResponse(item.response);
      setSearchError(null);
    } else {
      handleSearch({
        query: item.query,
        top_k: item.top_k,
        explain: item.explain,
      });
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

  // Show login page if no user
  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="relative min-h-screen bg-cream text-ink flex flex-col font-sans selection:bg-brand-burg/20 selection:text-ink overflow-x-hidden">
      {/* Subtle cursor ambient spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 opacity-60"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(107, 26, 42, 0.045), transparent 80%)`,
        }}
      />

      {/* Top Header */}
      <Header user={user} onLogout={logout} />

      {/* Main layout: Sidebar + Central Search & Results */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar: Repository Source, Session Index & Search History */}
        <RepoPanel
          onUploadZip={handleUploadZip}
          onIndexGithub={handleIndexGithub}
          isIndexing={isIndexing}
          indexingStep={indexingStep}
          activeRepo={activeRepo}
          repoDetails={repoDetails}
          sessionRepos={sessionRepos}
          onSelectRepo={(id) => selectRepo(id)}
          searchHistory={searchHistory}
          currentQuery={searchQuery}
          onSelectHistory={handleSelectHistory}
          onRemoveHistoryItem={removeSearchHistoryItem}
          onClearHistory={clearSearchHistory}
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
                  top_k: searchParams?.top_k || 5,
                  explain: true,
                });
              }}
            />
          )}
        </main>
      </div>

      {/* Dedicated Immersive Loading Screen during Indexing & Chunking */}
      <IndexingOverlay
        isIndexing={isIndexing}
        indexingStep={indexingStep}
      />
    </div>
  );
}
