import { useState, useEffect, useCallback } from 'react';

const USER_KEY = 'rl_user';
const REPOS_KEY = 'rl_session_repos';
const HISTORY_KEY = 'rl_search_history';
const MAX_REPOS = 20;
const MAX_HISTORY = 50;

function makeAvatarInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readRepos() {
  try {
    const raw = localStorage.getItem(REPOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSession() {
  const [user, setUser] = useState(() => readUser());
  const [sessionRepos, setSessionRepos] = useState(() => readRepos());
  const [searchHistory, setSearchHistory] = useState(() => readHistory());

  // Keep session state in sync with user changes (clear on logout)
  useEffect(() => {
    if (!user) {
      setSessionRepos([]);
      setSearchHistory([]);
    }
  }, [user]);

  const login = useCallback((name, email) => {
    const avatarInitials = makeAvatarInitials(name.trim());
    const userData = { name: name.trim(), email: email.trim(), avatarInitials };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    // Restore repos & history from storage on login
    setSessionRepos(readRepos());
    setSearchHistory(readHistory());
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REPOS_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setUser(null);
    setSessionRepos([]);
    setSearchHistory([]);
  }, []);

  const addRepo = useCallback((repo) => {
    setSessionRepos((prev) => {
      const deduped = [repo, ...prev.filter((r) => r.repo_id !== repo.repo_id)];
      const capped = deduped.slice(0, MAX_REPOS);
      try {
        localStorage.setItem(REPOS_KEY, JSON.stringify(capped));
      } catch {
        // quota exceeded
      }
      return capped;
    });
  }, []);

  const clearRepos = useCallback(() => {
    localStorage.removeItem(REPOS_KEY);
    setSessionRepos([]);
  }, []);

  // Search history management per session
  const addSearchHistory = useCallback((entry) => {
    setSearchHistory((prev) => {
      const newEntry = {
        id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        ...entry,
      };

      // Filter out duplicate queries in the same repo to keep history clean & fresh
      const filtered = prev.filter(
        (h) => !(h.repo_id === entry.repo_id && h.query.toLowerCase() === entry.query.toLowerCase())
      );

      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // storage quota fallback
      }
      return updated;
    });
  }, []);

  const removeSearchHistoryItem = useCallback((id) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // quota fallback
      }
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback((repoId = null) => {
    setSearchHistory((prev) => {
      const updated = repoId ? prev.filter((item) => item.repo_id !== repoId) : [];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // quota fallback
      }
      return updated;
    });
  }, []);

  return {
    user,
    sessionRepos,
    searchHistory,
    login,
    logout,
    addRepo,
    clearRepos,
    addSearchHistory,
    removeSearchHistoryItem,
    clearSearchHistory,
  };
}

export default useSession;
