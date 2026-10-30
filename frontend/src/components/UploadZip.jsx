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
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-brand-blue bg-brand-blue/10'
            : isIndexing
            ? 'border-dark-border/40 bg-dark-surface/40 cursor-not-allowed opacity-60'
            : 'border-dark-border hover:border-dark-muted/80 bg-[#0d1117]/80 hover:bg-[#161b22]'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload ZIP archive file dropzone"
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2.5 rounded-full bg-dark-subtle text-brand-blue">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-dark-bright">
              <span className="text-brand-blue hover:underline">Click to browse</span> or drag and drop
            </p>
            <p className="text-[11px] text-dark-muted mt-0.5">
              Only .zip archives up to 50 MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2.5 rounded-md bg-dark-subtle/80 border border-dark-border text-xs">
          <div className="flex items-center gap-2 truncate">
            <FileArchive className="w-4 h-4 text-brand-blue shrink-0" />
            <span className="font-mono text-dark-bright truncate font-medium">
              {selectedFile.name}
            </span>
            <span className="text-dark-muted text-[11px] shrink-0 font-mono">
              ({formatBytes(selectedFile.size)})
            </span>
          </div>
          {!isIndexing && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-dark-border text-dark-muted hover:text-dark-bright"
              aria-label="Remove selected file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Client validation error */}
      {validationError && (
        <div className="flex items-center gap-1.5 p-2 rounded bg-red-950/30 border border-red-900/60 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!selectedFile || isIndexing}
        className="w-full py-2 px-3 rounded-md text-xs font-semibold bg-brand-green hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow transition-colors flex items-center justify-center gap-1.5"
      >
        <FileArchive className="w-3.5 h-3.5" />
        <span>{isIndexing ? 'Indexing archive…' : 'Upload & index ZIP'}</span>
      </button>
    </form>
  );
}

