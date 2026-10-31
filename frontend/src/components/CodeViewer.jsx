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
    <div className="relative rounded-lg overflow-hidden border border-[#3B1F27] bg-[#160C0E] text-xs font-mono shadow-md">
      {/* Code viewer action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#241318] border-b border-[#3B1F27] text-[#D4B8A5]">
        <div className="flex items-center gap-2 text-[11px] truncate">
          <span className="text-[#FEFCFA] font-semibold">{langInfo.name}</span>
          <span className="text-[#6E424D]">•</span>
          <span className="text-[#D4B8A5]">
            Lines {startLine}–{endLine}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy path:lines */}
          <button
            type="button"
            onClick={handleCopyPathLines}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#3B1F27]/60 hover:bg-[#4E2A34] text-[#E4D5C4] hover:text-white transition-colors text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-burg"
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
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#3B1F27]/60 hover:bg-[#4E2A34] text-[#E4D5C4] hover:text-white transition-colors text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-burg"
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
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#4A0E1C] hover:bg-[#6B1A2A] text-[#FAF6F0] transition-colors text-[11px] font-sans font-medium focus:outline-none focus:ring-1 focus:ring-brand-burg"
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
              style={{ ...style, backgroundColor: '#160C0E' }}
              className="p-3 text-[12px] leading-relaxed font-mono min-w-full select-text"
            >
              {tokens.map((line, i) => {
                const lineNumber = Number(startLine) + i;
                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    className="table-row hover:bg-[#2A151C]/60 transition-colors"
                  >
                    <span
                      className="table-cell text-right pr-4 pl-1 select-none text-[#8E6571] font-mono text-[11px] w-12 border-r border-[#3B1F27]"
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
          className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#160C0E] via-[#160C0E]/90 to-transparent flex items-end justify-center pb-1.5 cursor-pointer group"
          title="Click to expand full snippet"
        >
          <span className="text-[11px] font-sans text-brand-burgLight group-hover:text-cream flex items-center gap-1 bg-[#241318]/95 px-3 py-0.5 rounded-full border border-[#4E2A34] shadow-sm">
            <ChevronDown className="w-3 h-3" /> Show more code
          </span>
        </div>
      )}
    </div>
  );
}
