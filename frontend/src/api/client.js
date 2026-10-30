// HTTP API client for RepoLens backend
// Implements all 5 frozen endpoints with seamless VITE_USE_MOCK support

import {
  MOCK_REPOSITORIES,
  simulateLatency,
  getMockSearchResponse,
  setMockError,
  getMockError,
} from './mock.js';

// Base URL: relative "/api" by default (routed through Vite dev proxy) unless overridden
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Initial mock mode from env var (defaults to true for standalone preview unless explicitly false)
const envVal = import.meta.env.VITE_USE_MOCK;
const DEFAULT_USE_MOCK = envVal === undefined ? true : (envVal === 'true' || envVal === true);
let isMockActive = DEFAULT_USE_MOCK;

// State listener for UI indicators
const listeners = new Set();
function notifyListeners() {
  listeners.forEach((fn) => fn(isMockActive, getMockError()));
}

export function subscribeToApiState(fn) {
  listeners.add(fn);
  fn(isMockActive, getMockError());
  return () => listeners.delete(fn);
}

export function setMockMode(active) {
  isMockActive = !!active;
  notifyListeners();
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

// In-memory mock repositories store for current session
const sessionMockRepos = { ...MOCK_REPOSITORIES };

// Standardized error handler that extracts backend {"detail": "..."}
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

/**
 * 1. Health check: GET /api/health
 */
export async function checkHealth() {
  if (isMockActive) {
    await simulateLatency();
    const simErr = getMockError();
    if (simErr === '502') {
      const err = new Error('Upstream mock server failure');
      err.status = 502;
      err.detail = 'Upstream mock server failure';
      throw err;
    }
    return { status: 'ok' };
  }

  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return await handleResponse(res);
  } catch (err) {
    if (!err.detail) {
      err.detail = 'Cannot connect to backend server at http://localhost:8000';
    }
    throw err;
  }
}

/**
 * 2. Upload ZIP repository: POST /api/repositories/upload
 * multipart form field name: "file"
 */
export async function uploadZip(file) {
  if (isMockActive) {
    await simulateLatency();
    const simErr = getMockError();
    if (simErr === '404') {
      const err = new Error('Invalid archive structure');
      err.status = 404;
      err.detail = 'Invalid archive structure';
      throw err;
    }
    if (simErr === '502') {
      const err = new Error('Indexing engine crash (simulated 502)');
      err.status = 502;
      err.detail = 'Indexing engine crash (simulated 502)';
      throw err;
    }

    const cleanName = (file?.name || 'uploaded-project').replace(/\.zip$/i, '');
    const generatedId = `zip-${Date.now().toString(36)}`;
    const newRepo = {
      repo_id: generatedId,
      name: cleanName,
      indexed_files: Math.floor(Math.random() * 30) + 25,
      indexed_chunks: Math.floor(Math.random() * 90) + 80,
      languages: {
        python: 28,
        typescript: 12,
        markdown: 4,
      },
      skipped: {
        excluded_dir: 10,
        generated: 2,
        too_large: 0,
        binary: 1,
        unsupported: 0,
        limit: 0,
      },
      sampleQueries: [
        'Where is authentication implemented?',
        'Show repository indexing logic',
        'How are search rankings calculated?',
      ],
    };
    sessionMockRepos[generatedId] = newRepo;
    return {
      repo_id: newRepo.repo_id,
      name: newRepo.name,
      indexed_files: newRepo.indexed_files,
      indexed_chunks: newRepo.indexed_chunks,
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE}/repositories/upload`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(res);
  } catch (err) {
    if (!err.detail) {
      err.detail = err.message || 'Failed to upload ZIP repository';
    }
    throw err;
  }
}

/**
 * 3. Index GitHub repository: POST /api/repositories/github
 * body: {"url": "https://github.com/owner/repo"}
 */
export async function indexGithub(url) {
  if (isMockActive) {
    await simulateLatency();
    const simErr = getMockError();
    if (simErr === '502') {
      const err = new Error('GitHub API rate limit exceeded or upstream failure');
      err.status = 502;
      err.detail = 'GitHub API rate limit exceeded or upstream failure';
      throw err;
    }

    const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    const repoName = match ? match[2].replace(/\.git$/i, '') : 'github-repo';
    const generatedId = `gh-${Date.now().toString(36)}`;
    const newRepo = {
      repo_id: generatedId,
      name: repoName,
      indexed_files: Math.floor(Math.random() * 40) + 30,
      indexed_chunks: Math.floor(Math.random() * 120) + 90,
      languages: {
        python: 34,
        json: 6,
        markdown: 5,
      },
      skipped: {
        excluded_dir: 12,
        generated: 1,
        too_large: 0,
        binary: 2,
        unsupported: 0,
        limit: 0,
      },
      sampleQueries: [
        'Where is authentication implemented?',
        'How are search rankings calculated?',
        'Where is the API router defined?',
      ],
    };
    sessionMockRepos[generatedId] = newRepo;
    return {
      repo_id: newRepo.repo_id,
      name: newRepo.name,
      indexed_files: newRepo.indexed_files,
      indexed_chunks: newRepo.indexed_chunks,
    };
  }

  try {
    const res = await fetch(`${API_BASE}/repositories/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (!err.detail) {
      err.detail = err.message || 'Failed to index GitHub repository';
    }
    throw err;
  }
}

/**
 * 4. Get Repository details: GET /api/repositories/{repo_id}
 */
export async function getRepository(repoId) {
  if (isMockActive) {
    await simulateLatency();
    const simErr = getMockError();
    if (simErr === '404' || !sessionMockRepos[repoId]) {
      const err = new Error('Repository not found');
      err.status = 404;
      err.detail = 'Repository not found';
      throw err;
    }
    const repo = sessionMockRepos[repoId];
    return {
      repo_id: repo.repo_id,
      name: repo.name,
      indexed_files: repo.indexed_files,
      indexed_chunks: repo.indexed_chunks,
      languages: repo.languages || {},
      skipped: repo.skipped || {
        excluded_dir: 0,
        generated: 0,
        too_large: 0,
        binary: 0,
        unsupported: 0,
        limit: 0,
      },
    };
  }

  try {
    const res = await fetch(`${API_BASE}/repositories/${encodeURIComponent(repoId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return await handleResponse(res);
  } catch (err) {
    if (!err.detail) {
      err.detail = err.message || 'Failed to fetch repository details';
    }
    throw err;
  }
}

/**
 * 5. Search Code: POST /api/search
 * body: {"repo_id": "...", "query": "...", "top_k": 5, "explain": true}
 */
export async function searchCode({ repo_id, query, top_k = 5, explain = true }) {
  if (isMockActive) {
    await simulateLatency();
    return getMockSearchResponse(repo_id, query, top_k, explain);
  }

  try {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        repo_id,
        query,
        top_k: Number(top_k),
        explain: Boolean(explain),
      }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (!err.detail) {
      err.detail = err.message || 'Search request failed';
    }
    throw err;
  }
}

// Helper to get initial mock repositories for the UI list
export function getInitialMockRepos() {
  return Object.values(MOCK_REPOSITORIES);
}
