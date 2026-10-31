// HTTP API client for RepoLens backend
// Implements v1 + v2 contracts with seamless VITE_USE_MOCK support

import {
  MOCK_REPOSITORIES,
  MOCK_HISTORY,
  getMockUser,
  setMockUser,
  simulateLatency,
  getMockSearchResponse,
  setMockError,
  getMockError,
} from './mock.js';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const isMockActive = import.meta.env.VITE_USE_MOCK === 'true';
const LOCAL_USER_KEY = 'rl_user';

function readLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Could not read the saved local profile', error);
    return null;
  }
}

const listeners = new Set();
function notifyListeners() {
  listeners.forEach((fn) => fn(isMockActive, getMockError()));
}

export function subscribeToApiState(fn) {
  listeners.add(fn);
  fn(isMockActive, getMockError());
  return () => listeners.delete(fn);
}

export function isMockEnabled() {
  return isMockActive;
}

export function setSimulatedError(mode) {
  setMockError(mode);
  notifyListeners();
}

export function getSimulatedError() {
  return getMockError();
}

const sessionMockRepos = { ...MOCK_REPOSITORIES };
const sessionMockHistory = [...MOCK_HISTORY];

async function handleResponse(response) {
  if (response.ok) {
    return await response.json();
  }
  let detailMessage = `Request failed with HTTP ${response.status}`;
  try {
    const errorData = await response.json();
    if (errorData && errorData.detail) {
      detailMessage = typeof errorData.detail === 'string'
        ? errorData.detail
        : JSON.stringify(errorData.detail);
    }
  } catch {
    detailMessage = response.statusText || detailMessage;
  }

  const err = new Error(detailMessage);
  err.status = response.status;
  err.detail = detailMessage;
  throw err;
}

export async function login({ email }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const err = new Error('Please provide a valid email address');
    err.detail = err.message;
    throw err;
  }

  const user = {
    id: `local-${normalizedEmail}`,
    email: normalizedEmail,
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Could not save the local profile', error);
    throw new Error('Could not save your profile in this browser');
  }
  if (isMockActive) setMockUser(user);
  return user;
}

export async function logout() {
  try {
    localStorage.removeItem(LOCAL_USER_KEY);
  } catch (error) {
    console.error('Could not remove the saved local profile', error);
    throw new Error('Could not sign out in this browser');
  }
  if (isMockActive) setMockUser(null);
  return { detail: 'Logged out' };
}

export async function getMe() {
  const user = readLocalUser();
  if (user) return user;
  if (isMockActive && getMockUser()) {
    return getMockUser();
  }
  throw Object.assign(new Error('Not signed in'), { status: 401 });
}

/**
 * List user repositories: GET /api/repositories
 */
export async function listRepositories() {
  if (isMockActive) {
    await simulateLatency(200, 400);
    return Object.values(sessionMockRepos).map(r => ({
      repo_id: r.repo_id,
      name: r.name,
      status: r.status || 'ready',
      progress: r.progress || 1.0,
      indexed_files: r.indexed_files,
      indexed_chunks: r.indexed_chunks,
      created_at: new Date().toISOString(),
    }));
  }

  if (readLocalUser()) return [];

  const res = await fetch(`${API_BASE}/repositories`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return await handleResponse(res);
}

/**
 * Upload ZIP: POST /api/repositories/upload
 */
export async function uploadZip(file) {
  if (isMockActive) {
    await simulateLatency();
    const cleanName = (file?.name || 'uploaded-project').replace(/\.zip$/i, '');
    const generatedId = `zip-${Date.now().toString(36)}`;
    const newRepo = {
      repo_id: generatedId,
      name: cleanName,
      status: 'ready',
      progress: 1.0,
      indexed_files: 24,
      indexed_chunks: 78,
      languages: { python: 20, markdown: 4 },
      skipped: { excluded_dir: 0, generated: 0, too_large: 0, binary: 0, unsupported: 0, limit: 0 },
    };
    sessionMockRepos[generatedId] = newRepo;
    return { repo_id: generatedId, status: 'ready', name: cleanName, indexed_files: 24, indexed_chunks: 78 };
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/repositories/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return await handleResponse(res);
}

/**
 * Index GitHub: POST /api/repositories/github
 */
export async function indexGithub(url) {
  if (isMockActive) {
    await simulateLatency();
    const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    const repoName = match ? match[2].replace(/\.git$/i, '') : 'github-repo';
    const generatedId = `gh-${Date.now().toString(36)}`;
    const newRepo = {
      repo_id: generatedId,
      name: repoName,
      status: 'ready',
      progress: 1.0,
      indexed_files: 30,
      indexed_chunks: 95,
      languages: { python: 25, json: 5 },
      skipped: { excluded_dir: 0, generated: 0, too_large: 0, binary: 0, unsupported: 0, limit: 0 },
    };
    sessionMockRepos[generatedId] = newRepo;
    return { repo_id: generatedId, status: 'ready', name: repoName, indexed_files: 30, indexed_chunks: 95 };
  }

  const res = await fetch(`${API_BASE}/repositories/github`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ url }),
  });
  return await handleResponse(res);
}

/**
 * Get Repository: GET /api/repositories/{id}
 */
export async function getRepository(repoId) {
  if (isMockActive) {
    await simulateLatency(150, 300);
    const repo = sessionMockRepos[repoId];
    if (!repo) {
      const err = new Error('Repository not found');
      err.status = 404;
      err.detail = 'Repository not found';
      throw err;
    }
    return repo;
  }

  const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repoId)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return await handleResponse(res);
}

/**
 * Search: POST /api/search
 */
export async function searchCode({ repo_id, query, top_k = 10, explain = true, min_score = 0.35 }) {
  if (isMockActive) {
    await simulateLatency();
    const resp = getMockSearchResponse(repo_id, query, top_k, explain, min_score);
    sessionMockHistory.unshift({
      id: Date.now(),
      repo_id,
      query,
      result_count: resp.result_count,
      timestamp: new Date().toISOString(),
    });
    return resp;
  }

  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      repo_id,
      query,
      top_k: Number(top_k),
      explain: Boolean(explain),
      min_score: Number(min_score),
    }),
  });
  return await handleResponse(res);
}

/**
 * Search History: GET /api/history?repo_id=...
 */
export async function getSearchHistory(repoId = null) {
  if (isMockActive) {
    await simulateLatency(100, 200);
    if (repoId) {
      return sessionMockHistory.filter(h => h.repo_id === repoId);
    }
    return sessionMockHistory;
  }

  if (readLocalUser()) return [];

  const url = repoId ? `${API_BASE}/history?repo_id=${encodeURIComponent(repoId)}` : `${API_BASE}/history`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  return await handleResponse(res);
}

export async function getBenchmark() {
  const res = await fetch(`${API_BASE}/benchmark`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return await handleResponse(res);
}

export function getInitialMockRepos() {
  return Object.values(MOCK_REPOSITORIES);
}
