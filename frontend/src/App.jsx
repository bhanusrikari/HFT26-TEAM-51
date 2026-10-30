import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { RepoPanel } from './components/RepoPanel';
import { SearchBar } from './components/SearchBar';
import { ExplanationPanel } from './components/ExplanationPanel';
import { ResultsList } from './components/ResultsList';
import AuthModal from './components/AuthModal';
import BenchmarkModal from './components/BenchmarkModal';
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
  getMe,
  logout,
  listRepositories,
  getSearchHistory,
  getInitialMockRepos,
  isMockEnabled,
} from './api/client';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null);

  // Benchmark modal
  const [showBenchmark, setShowBenchmark] = useState(false);

  // Active repository state
  const [activeRepo, setActiveRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [sessionRepos, setSessionRepos] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  // Indexing status
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStep, setIndexingStep] = useState('');
  const pollTimerRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Check auth session on mount
  useEffect(() => {
    let active = true;
    getMe()
      .then((user) => {
        if (active) {
          setCurrentUser(user);
          loadUserRepos();
        }
      })
      .catch((err) => {
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
        if (active) setAuthChecked(true);
      });

    return () => { active = false; };
  }, []);

  const handleAuthError = (err) => {
    if (err?.status === 401) {
      setCurrentUser(null);
      setSessionExpiredMsg('Session expired. Please log in again.');
      return true;
    }
    return false;
  };

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

  const loadHistory = async (repoId) => {
    try {
      const history = await getSearchHistory(repoId);
      setSearchHistory(history || []);
    } catch (err) {
      handleAuthError(err);
    }
  };

  // Select active repository and load its detailed stats & history
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

  // Poll repository status until ready or failed
  const pollRepoStatus = (repoId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const repo = await getRepository(repoId);
        setActiveRepo(repo);
        setRepoDetails(repo);

        if (repo.status === 'ready' || repo.status === 'failed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setIsIndexing(false);
          setIndexingStep('');
          loadUserRepos();
        }
      } catch (err) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setIsIndexing(false);
      }
    }, 1500);
  };

  // 1. Handle Upload ZIP
  const handleUploadZip = async (file) => {
    setIsIndexing(true);
    setSearchError(null);
    setIndexingStep('Uploading…');

    try {
      const res = await uploadZip(file);
      setSessionRepos((prev) => [res, ...prev.filter((r) => r.repo_id !== res.repo_id)]);
      setActiveRepo(res);
      setRepoDetails(res);

      if (res.status === 'queued' || res.status === 'cloning' || res.status === 'parsing') {
        pollRepoStatus(res.repo_id);
      } else {
        setIsIndexing(false);
        setIndexingStep('');
        await selectRepo(res.repo_id, res);
      }
    } catch (err) {
      setIsIndexing(false);
      if (!handleAuthError(err)) {
        setSearchError(err);
      }
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
      setActiveRepo(res);
      setRepoDetails(res);

      if (res.status === 'queued' || res.status === 'cloning' || res.status === 'parsing') {
        pollRepoStatus(res.repo_id);
      } else {
        setIsIndexing(false);
        setIndexingStep('');
        await selectRepo(res.repo_id, res);
      }
    } catch (err) {
      setIsIndexing(false);
      if (!handleAuthError(err)) {
        setSearchError(err);
      }
    }
  };

  // 3. Handle Search
  const handleSearch = async ({ query, top_k = 10, explain = true, min_score = 0.35 }) => {
    if (!activeRepo) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);
    setSearchParams({ query, top_k, explain, min_score });

    try {
      const response = await searchCode({
        repo_id: activeRepo.repo_id,
        query,
        top_k,
        explain,
        min_score,
      });
      setSearchResponse(response);
      loadHistory(activeRepo.repo_id);
    } catch (err) {
      if (!handleAuthError(err)) {
        setSearchError(err);
        setSearchResponse(null);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleShowLowRelevance = () => {
    if (searchParams) {
      handleSearch({
        ...searchParams,
        min_score: 0.0,
      });
    }
  };

  // 4. Citation click handler
  const handleCitationClick = (citationNumber) => {
    const cardEl = document.getElementById(`result-card-${citationNumber}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.remove('citation-highlight');
      void cardEl.offsetWidth;
      cardEl.classList.add('citation-highlight');
      cardEl.focus();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCurrentUser(null);
      setActiveRepo(null);
      setRepoDetails(null);
      setSessionRepos([]);
      setSearchResponse(null);
    }
  };

  const is404Error = searchError?.status === 404;

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        onOpenBenchmark={() => setShowBenchmark(true)}
      />

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar */}
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
          onSelectHistoryQuery={(q) => {
            setSearchQuery(q);
            handleSearch({ query: q, top_k: 10, explain: true });
          }}
        />

        {/* Central Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0" role="main">
          {/* Search bar & query chips */}
          <SearchBar
            onSearch={handleSearch}
            isSearching={isSearching}
            hasActiveRepo={!!activeRepo && repoDetails?.status === 'ready'}
            activeRepoName={activeRepo?.name}
            sampleQueries={repoDetails?.sampleQueries || activeRepo?.sampleQueries || []}
            externalQuery={searchQuery}
          />

          {/* Error Banner with Retry */}
          {searchError && (
            <ErrorBanner
              error={searchError}
              onRetry={searchParams ? () => handleSearch(searchParams) : null}
              is404={is404Error}
              onReindex={() => {
                setActiveRepo(null);
                setSearchError(null);
              }}
            />
          )}

          {/* AI Explanation Panel */}
          <ExplanationPanel
            explanation={searchResponse?.explanation}
            explanationError={searchResponse?.explanation_error}
            isLoading={isSearching}
            results={searchResponse?.results || []}
            activeRepo={activeRepo}
            onCitationClick={handleCitationClick}
          />

          {/* Results display area */}
          {isSearching ? (
            <ResultsSkeleton count={searchParams?.top_k || 5} />
          ) : searchResponse ? (
            searchResponse.results && searchResponse.results.length > 0 ? (
              <ResultsList
                query={searchResponse.query}
                results={searchResponse.results}
                resultCount={searchResponse.result_count}
                lowRelevanceCount={searchResponse.low_relevance_count || 0}
                onShowLowRelevance={handleShowLowRelevance}
              />
            ) : (
              <ResultsList
                query={searchResponse.query}
                results={[]}
                resultCount={0}
                lowRelevanceCount={searchResponse.low_relevance_count || 0}
                onShowLowRelevance={handleShowLowRelevance}
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
                  top_k: 10,
                  explain: true,
                });
              }}
            />
          )}
        </main>
      </div>

      {/* Auth Modal if unauthenticated */}
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

      {/* Benchmark Modal */}
      {showBenchmark && (
        <BenchmarkModal onClose={() => setShowBenchmark(false)} />
      )}
    </div>
  );
}
