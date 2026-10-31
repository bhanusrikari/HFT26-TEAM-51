import React, { useState, useRef } from 'react';
import { Upload, FileArchive, X, AlertCircle } from 'lucide-react';
import { formatBytes } from '../lib/format';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit

export function UploadZip({ onUpload, isIndexing }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setValidationError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setValidationError('Please upload a valid .zip archive file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(`Archive is ${formatBytes(file.size)}. Maximum allowed size is 50 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isIndexing) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (isIndexing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile && !isIndexing) {
      onUpload(selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={handleFileChange}
        disabled={isIndexing}
        className="hidden"
        id="zip-upload-input"
      />

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isIndexing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 shadow-xs ${
          dragOver
            ? 'border-brand-burg bg-brand-burg/10 scale-[1.01]'
            : isIndexing
            ? 'border-cream-darker/70 bg-cream-dark/40 cursor-not-allowed opacity-60'
            : 'border-cream-darker hover:border-brand-burg bg-cream-warm hover:bg-cream'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload ZIP archive file dropzone"
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2.5 rounded-full bg-cream-dark border border-cream-darker text-brand-burg">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">
              <span className="text-brand-burg hover:underline">Click to browse</span> or drag and drop
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Only .zip archives up to 50 MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-cream-warm border border-cream-darker text-xs shadow-xs">
          <div className="flex items-center gap-2 truncate">
            <FileArchive className="w-4 h-4 text-brand-burg shrink-0" />
            <span className="font-mono text-ink truncate font-semibold">
              {selectedFile.name}
            </span>
            <span className="text-ink-muted text-[11px] shrink-0 font-mono">
              ({formatBytes(selectedFile.size)})
            </span>
          </div>
          {!isIndexing && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-cream-dark text-ink-muted hover:text-danger transition-colors"
              aria-label="Remove selected file"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Client validation error */}
      {validationError && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!selectedFile || isIndexing}
        className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow transition-all flex items-center justify-center gap-1.5 active:scale-98"
        style={{ background: '#6B1A2A', color: '#FAF6F0' }}
        onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#4A0E1C'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#6B1A2A'; }}
      >
        <FileArchive className="w-3.5 h-3.5" />
        <span>{isIndexing ? 'Indexing archive…' : 'Upload & index ZIP'}</span>
      </button>
    </form>
  );
}
