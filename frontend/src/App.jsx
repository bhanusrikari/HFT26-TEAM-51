```jsx
import React, { useState, useEffect, useRef } from 'react';

import { Header } from './components/Header';
import { RepoPanel } from './components/RepoPanel';
import { SearchBar } from './components/SearchBar';
import { ExplanationPanel } from './components/ExplanationPanel';
import { ResultsList } from './components/ResultsList';
import { IndexingOverlay } from './components/IndexingOverlay';
import AuthModal from './components/AuthModal';
import BenchmarkModal from './components/BenchmarkModal';

import {
  InitialState,
  ResultsSkeleton,
  ErrorBanner,
} from './components/States';

import {
  uploadZip,
  indexGithub,
  getRepository,
  searchCode,
  getMe,
  logout as apiLogout,
  listRepositories,
  getSearchHistory,
  getInitialMockRepos,
  isMockEnabled,
} from './api/client';

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

  // Benchmark modal
  const [showBenchmark, setShowBenchmark] = useState(false);

  // Repository state
  const [activeRepo, setActiveRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [sessionRepos, setSessionRepos] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  // Indexing state
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStep, setIndexingStep] = useState('');

  const pollTimerRef = useRef(null);
  const indexingTimeoutsRef = useRef([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Cursor spotlight
  const [mousePos, setMousePos] = useState({
    x: -1000,
    y: -1000,
  });

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      indexingTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Clear indexing progress timeouts
  const clearIndexingTimeouts = () => {
    indexingTimeoutsRef.current.forEach(clearTimeout);
    indexingTimeoutsRef.current = [];
  };

  // Update indexing progress
  const scheduleIndexingSteps = (steps) => {
    clearIndexingTimeouts();

    steps.forEach(({ delay, message }) => {
      const timer = setTimeout(() => {
        setIndexingStep(message);
      }, delay);

      indexingTimeoutsRef.current.push(timer);
    });
  };

  // Authentication check on mount
  useEffect(() => {
    let active = true;

    getMe()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          loadUserRepos();
        }
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);

          if (isMockEnabled()) {
            const initial = getInitialMockRepos();

            setSessionRepos(initial);

            if (initial.length > 0) {
              selectRepo(initial[0].repo_id, initial[0]);
            }
          }
        }
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Handle authentication errors
  const handleAuthError = (err) => {
    if (err?.status === 401) {
      setCurrentUser(null);
      setSessionExpiredMsg('Session expired. Please log in again.');
      return true;
    }

    return false;
  };

  // Load repositories
  const loadUserRepos = async () => {
    try {
      const repos = await listRepositories();

      setSessionRepos(repos || []);

      if (repos && repos.length > 0 && !activeRepo) {
        selectRepo(repos[0].repo_id, repos[0]);
      }
    } catch (err) {
      handleAuthError(err);
    }
  };

  // Load search history
  const loadHistory = async (repoId) => {
    try {
      const history = await getSearchHistory(repoId);
      setSearchHistory(history || []);
    } catch (err) {
      handleAuthError(err);
    }
  };

  // Select repository
  const selectRepo = async (repoId, fallbackRepo = null) => {
    setSearchError(null);
    setSearchResponse(null);
    setSearchQuery('');

    const existing =
      sessionRepos.find((repo) => repo.repo_id === repoId) ||
      fallbackRepo;

    if (existing) {
      setActiveRepo(existing);
    }

    try {
      const details = await getRepository(repoId);

      setRepoDetails(details);
      setActiveRepo(details);

      loadHistory(repoId);
    } catch (err) {
      if (!handleAuthError(err)) {
        if (existing) {
          setRepoDetails(existing);
        } else {
          setSearchError(err);
        }
      }
    }
  };

  // Poll repository indexing status
  const pollRepoStatus = (repoId) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const repo = await getRepository(repoId);

        setActiveRepo((prev) =>
          prev?.repo_id === repoId ? repo : prev
        );

        setRepoDetails((prev) =>
          prev?.repo_id === repoId ? repo : prev
        );

        if (repo.status === 'ready' || repo.status === 'failed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;

          clearIndexingTimeouts();

          setIsIndexing(false);
          setIndexingStep('');

          await loadUserRepos();
        }
      } catch (err) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;

        clearIndexingTimeouts();

        setIsIndexing(false);

        handleAuthError(err);
      }
    }, 1500);
  };

  // Handle ZIP upload
  const handleUploadZip = async (file) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Uploading…');

    try {
      scheduleIndexingSteps([
        {
          delay: 500,
          message: 'Unpacking & indexing files…',
        },
        {
          delay: 1100,
          message: 'Extracting AST chunk symbols…',
        },
      ]);

      const res = await uploadZip(file);

      setSessionRepos((prev) => [
        res,
        ...prev.filter((repo) => repo.repo_id !== res.repo_id),
      ]);

      setActiveRepo(res);
      setRepoDetails(res);

      if (
        ['queued', 'cloning', 'parsing'].includes(res.status)
      ) {
        pollRepoStatus(res.repo_id);
      } else {
        clearIndexingTimeouts();

        setIsIndexing(false);
        setIndexingStep('');

        await selectRepo(res.repo_id, res);
      }
    } catch (err) {
      clearIndexingTimeouts();

      setIsIndexing(false);
      setIndexingStep('');

      if (!handleAuthError(err)) {
        setSearchError(err);
      }
    }
  };

  // Handle GitHub indexing
  const handleIndexGithub = async (url) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Indexing…');

    try {
      scheduleIndexingSteps([
        {
          delay: 500,
          message: 'Cloning tree & reading manifests…',
        },
        {
          delay: 1100,
          message: 'Chunking symbols and indexing…',
        },
      ]);

      const res = await indexGithub(url);

      setSessionRepos((prev) => [
        res,
        ...prev.filter((repo) => repo.repo_id !== res.repo_id),
      ]);

      setActiveRepo(res);
      setRepoDetails(res);

      if (
        ['queued', 'cloning', 'parsing'].includes(res.status)
      ) {
        pollRepoStatus(res.repo_id);
      } else {
        clearIndexingTimeouts();

        setIsIndexing(false);
        setIndexingStep('');

        await selectRepo(res.repo_id, res);
      }
    } catch (err) {
      clearIndexingTimeouts();

      setIsIndexing(false);
      setIndexingStep('');

      if (!handleAuthError(err)) {
        setSearchError(err);
      }
    }
  };

  // 3. Handle Search & record in session history
  const handleSearch = async ({ query, top_k, explain }) => {
    if (!activeRepo) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);

    setSearchParams({
      query,
      top_k,
      explain,
      min_score,
    });

    try {
      const response = await searchCode({
        repo_id: activeRepo.repo_id,
        query,
        top_k,
        explain,
        min_score,
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
      if (!handleAuthError(err)) {
        setSearchError(err);
        setSearchResponse(null);
      }
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
    const cardEl = document.getElementById(
      `result-card-${citationNumber}`
    );

    if (cardEl) {
      cardEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      cardEl.classList.remove('citation-highlight');

      void cardEl.offsetWidth;

      cardEl.classList.add('citation-highlight');
      cardEl.focus();
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      clearIndexingTimeouts();

      setCurrentUser(null);
      setActiveRepo(null);
      setRepoDetails(null);
      setSessionRepos([]);
      setSearchHistory([]);
      setSearchResponse(null);
      setSearchError(null);
      setSearchQuery('');
      setSearchParams(null);
      setIsIndexing(false);
      setIndexingStep('');
    }
  };

  const is404Error = searchError?.status === 404;

  return (
    <div className="relative min-h-screen bg-cream text-ink flex flex-col font-sans selection:bg-brand-burg/20 selection:text-ink overflow-x-hidden">

      {/* Cursor ambient spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 opacity-60"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(107, 26, 42, 0.045), transparent 80%)`,
        }}
      />

      {/* Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        onOpenBenchmark={() => setShowBenchmark(true)}
      />

      {/* Main layout */}
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
          searchHistory={searchHistory}
          onSelectRepo={(id) => selectRepo(id)}
          searchHistory={searchHistory}
          currentQuery={searchQuery}
          onSelectHistory={handleSelectHistory}
          onRemoveHistoryItem={removeSearchHistoryItem}
          onClearHistory={clearSearchHistory}
        />

        {/* Central workspace */}
        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0"
          role="main"
        >

          {/* Search bar */}
          <SearchBar
            onSearch={handleSearch}
            isSearching={isSearching}
            hasActiveRepo={
              !!activeRepo && repoDetails?.status === 'ready'
            }
            activeRepoName={activeRepo?.name}
            sampleQueries={
              repoDetails?.sampleQueries ||
              activeRepo?.sampleQueries ||
              []
            }
            externalQuery={searchQuery}
          />

          {/* Error banner */}
          {searchError && (
            <ErrorBanner
              error={searchError}
              onRetry={
                searchParams
                  ? () => handleSearch(searchParams)
                  : null
              }
              is404={is404Error}
              onReindex={() => {
                setActiveRepo(null);
                setRepoDetails(null);
                setSearchError(null);
              }}
            />
          )}

          {/* AI explanation */}
          <ExplanationPanel
            explanation={searchResponse?.explanation}
            explanationError={searchResponse?.explanation_error}
            isLoading={isSearching}
            results={searchResponse?.results || []}
            activeRepo={activeRepo}
            onCitationClick={handleCitationClick}
          />

          {/* Search results */}
          {isSearching ? (
            <ResultsSkeleton
              count={searchParams?.top_k || 5}
            />
          ) : searchResponse ? (
            searchResponse.results &&
            searchResponse.results.length > 0 ? (
              <ResultsList
                query={searchResponse.query}
                results={searchResponse.results}
                resultCount={searchResponse.result_count}
                lowRelevanceCount={
                  searchResponse.low_relevance_count || 0
                }
                onShowLowRelevance={handleShowLowRelevance}
              />
            ) : (
              <ResultsList
                query={searchResponse.query}
                results={[]}
                resultCount={0}
                lowRelevanceCount={
                  searchResponse.low_relevance_count || 0
                }
                onShowLowRelevance={handleShowLowRelevance}
              />
            )
          ) : (
            <InitialState
              repoName={activeRepo?.name}
              sampleQueries={
                repoDetails?.sampleQueries ||
                activeRepo?.sampleQueries ||
                []
              }
              onSampleClick={(query) => {
                setSearchQuery(query);

                handleSearch({
                  query,
                  top_k: searchParams?.top_k || 5,
                  explain: true,
                });
              }}
            />
          )}
        </main>
      </div>

      {/* Indexing overlay */}
      <IndexingOverlay
        isIndexing={isIndexing}
        indexingStep={indexingStep}
      />

      {/* Authentication modal */}
      {authChecked && !currentUser && (
        <AuthModal
          sessionExpiredMessage={sessionExpiredMsg}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setSessionExpiredMsg(null);
            loadUserRepos();
          }}
        />
      )}

      {/* Benchmark modal */}
      {showBenchmark && (
        <BenchmarkModal
          onClose={() => setShowBenchmark(false)}
        />
      )}
    </div>
  );
}
```