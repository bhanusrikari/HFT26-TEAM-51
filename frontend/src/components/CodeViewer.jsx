import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import { getLanguageInfo } from '../lib/languages';

export function CodeViewer({
  code,
  language,
  startLine = 1,
  filePath = '',
  endLine = 1,
  defaultExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const langInfo = getLanguageInfo(language);
  const cleanCode = (code || '').trimEnd();
  const pathLinesRef = `${filePath}:${startLine}-${endLine}`;

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleCopyPathLines = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(pathLinesRef);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (err) {
      console.error('Failed to copy path: ', err);
    }
  };

  return (
    <div className="relative rounded-md overflow-hidden border border-dark-border/80 bg-[#161b22] text-xs font-mono shadow-inner">
      {/* Code viewer action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#0d1117] border-b border-dark-border/80 text-dark-muted">
        <div className="flex items-center gap-2 text-[11px] truncate">
          <span className="text-dark-text font-medium">{langInfo.name}</span>
          <span className="text-dark-border">•</span>
          <span className="text-dark-muted">
            Lines {startLine}–{endLine}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy path:lines */}
          <button
            type="button"
            onClick={handleCopyPathLines}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-subtle hover:text-dark-bright transition-colors text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-blue"
            title={`Copy snippet reference: ${pathLinesRef}`}
            aria-label="Copy file path and line numbers"
          >
            {copiedRef ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copied ref</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="font-sans hidden xs:inline">Copy ref</span>
              </>
            )}
          </button>

          {/* Copy full code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-subtle hover:text-dark-bright transition-colors text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-blue"
            title="Copy code snippet to clipboard"
            aria-label="Copy code snippet"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans hidden xs:inline">Copy code</span>
              </>
            )}
          </button>

          {/* Expand / Collapse toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-dark-subtle hover:bg-dark-border text-dark-text hover:text-white transition-colors text-[11px] font-sans focus:outline-none focus:ring-1 focus:ring-brand-blue"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse code snippet' : 'Expand full code snippet'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Highlighted code block with line numbers & horizontal scrolling */}
      <div
        className={`overflow-x-auto transition-all duration-200 ${
          isExpanded ? 'max-h-none' : 'max-h-[320px]'
        }`}
      >
        <Highlight
          theme={themes.oneDark || themes.vsDark}
          code={cleanCode}
          language={langInfo.prism || 'clike'}
        >
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              style={{ ...style, backgroundColor: '#0d1117' }}
              className="p-3 text-[12px] leading-relaxed font-mono min-w-full select-text"
            >
              {tokens.map((line, i) => {
                const lineNumber = Number(startLine) + i;
                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    className="table-row hover:bg-dark-subtle/50 transition-colors"
                  >
                    <span
                      className="table-cell text-right pr-4 pl-1 select-none text-dark-muted/60 font-mono text-[11px] w-12 border-r border-dark-border/40"
                      aria-hidden="true"
                    >
                      {lineNumber}
                    </span>
                    <span className="table-cell pl-4 pr-2 whitespace-pre font-mono">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>

      {/* Fade overlay when collapsed if code is long */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/80 to-transparent flex items-end justify-center pb-1 cursor-pointer group"
          title="Click to expand full snippet"
        >
          <span className="text-[11px] font-sans text-brand-blue group-hover:underline flex items-center gap-1 bg-[#161b22]/90 px-3 py-0.5 rounded-full border border-dark-border/60">
            <ChevronDown className="w-3 h-3" /> Show more code
          </span>
        </div>
      )}
    </div>
  );
}

