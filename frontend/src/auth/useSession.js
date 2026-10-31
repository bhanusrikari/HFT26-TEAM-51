import { useState, useEffect, useCallback } from 'react';

const USER_KEY = 'rl_user';
const REPOS_KEY = 'rl_session_repos';
const MAX_REPOS = 20;

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

export function useSession() {
  const [user, setUser] = useState(() => readUser());
  const [sessionRepos, setSessionRepos] = useState(() => readRepos());

  // Keep sessionRepos in sync with user changes (clear repos on logout)
  useEffect(() => {
    if (!user) {
      setSessionRepos([]);
    }
  }, [user]);

  const login = useCallback((name, email) => {
    const avatarInitials = makeAvatarInitials(name.trim());
    const userData = { name: name.trim(), email: email.trim(), avatarInitials };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    // Restore repos from storage on login
    setSessionRepos(readRepos());
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REPOS_KEY);
    setUser(null);
    setSessionRepos([]);
  }, []);

  const addRepo = useCallback((repo) => {
    setSessionRepos((prev) => {
      const deduped = [repo, ...prev.filter((r) => r.repo_id !== repo.repo_id)];
      const capped = deduped.slice(0, MAX_REPOS);
      try {
        localStorage.setItem(REPOS_KEY, JSON.stringify(capped));
      } catch {
        // storage quota exceeded — silently ignore
      }
      return capped;
    });
  }, []);

  const clearRepos = useCallback(() => {
    localStorage.removeItem(REPOS_KEY);
    setSessionRepos([]);
  }, []);

  return { user, sessionRepos, login, logout, addRepo, clearRepos };
}

export default useSession;

