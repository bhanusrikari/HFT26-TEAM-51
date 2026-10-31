import React, { useState } from 'react';
import { Github, ArrowRight, AlertCircle } from 'lucide-react';

// Regex for github repo URL: https://github.com/owner/repo, optional .git or /tree/branch
const GITHUB_REGEX = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/;

export function GithubForm({ onIndex, isIndexing }) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateUrl = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Please enter a GitHub repository URL.');
      return false;
    }
    if (!GITHUB_REGEX.test(trimmed)) {
      setValidationError('Must be a valid GitHub URL, e.g. https://github.com/owner/repo');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleChange = (e) => {
    setUrl(e.target.value);
    if (validationError) {
      validateUrl(e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateUrl(url) && !isIndexing) {
      onIndex(url.trim());
    }
  };

  const handleQuickExample = (exampleUrl) => {
    setUrl(exampleUrl);
    setValidationError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="github-repo-url"
          className="block text-xs font-semibold text-ink mb-1"
        >
          Public GitHub Repository URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-ink-muted">
            <Github className="w-4 h-4" />
          </div>
          <input
            id="github-repo-url"
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="https://github.com/pallets/flask"
            disabled={isIndexing}
            className="w-full pl-8 pr-3 py-2 bg-cream-warm border border-cream-darker rounded-lg text-xs font-mono text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-burg focus:ring-1 focus:ring-brand-burg transition-all disabled:opacity-50 shadow-xs"
          />
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Quick sample URLs for fast testing */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-ink-muted block">Try an example:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isIndexing}
            onClick={() => handleQuickExample('https://github.com/pallets/flask')}
            className="text-[11px] font-mono px-2 py-1 rounded-md bg-cream-warm hover:bg-cream text-ink border border-cream-darker hover:border-brand-burg/40 transition-colors shadow-xs"
          >
            pallets/flask
          </button>
          <button
            type="button"
            disabled={isIndexing}
            onClick={() => handleQuickExample('https://github.com/expressjs/express')}
            className="text-[11px] font-mono px-2 py-1 rounded-md bg-cream-warm hover:bg-cream text-ink border border-cream-darker hover:border-brand-burg/40 transition-colors shadow-xs"
          >
            expressjs/express
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!url.trim() || isIndexing}
        className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow transition-all flex items-center justify-center gap-1.5 active:scale-98"
        style={{ background: '#6B1A2A', color: '#FAF6F0' }}
        onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#4A0E1C'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#6B1A2A'; }}
      >
        <span>{isIndexing ? 'Indexing repository…' : 'Index repository'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}
