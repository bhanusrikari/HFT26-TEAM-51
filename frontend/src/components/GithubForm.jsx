import React, { useState } from 'react';
import { Github, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
          className="block text-xs font-medium text-dark-text mb-1"
        >
          Public GitHub Repository URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-dark-muted">
            <Github className="w-4 h-4" />
          </div>
          <input
            id="github-repo-url"
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="https://github.com/fastapi/fastapi"
            disabled={isIndexing}
            className="w-full pl-8 pr-3 py-2 bg-[#0d1117] border border-dark-border rounded-md text-xs font-mono text-dark-bright placeholder:text-dark-muted/60 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-1.5 p-2 rounded bg-red-950/30 border border-red-900/60 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Quick sample URLs for fast testing */}
      <div className="space-y-1">
        <span className="text-[11px] text-dark-muted block">Try an example:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isIndexing}
            onClick={() => handleQuickExample('https://github.com/pallets/flask')}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-dark-subtle hover:bg-dark-border text-dark-muted hover:text-dark-bright transition-colors"
          >
            pallets/flask
          </button>
          <button
            type="button"
            disabled={isIndexing}
            onClick={() => handleQuickExample('https://github.com/expressjs/express')}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-dark-subtle hover:bg-dark-border text-dark-muted hover:text-dark-bright transition-colors"
          >
            expressjs/express
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!url.trim() || isIndexing}
        className="w-full py-2 px-3 rounded-md text-xs font-semibold bg-brand-blue hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1117] font-bold shadow transition-colors flex items-center justify-center gap-1.5"
      >
        <span>{isIndexing ? 'Indexing repository…' : 'Index repository'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

