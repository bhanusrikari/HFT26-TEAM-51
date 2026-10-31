import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Code2,
  FileCode,
  Layers,
  Cpu,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    id: 1,
    title: 'Archive Ingestion',
    desc: 'Safe extraction, ZIP-slip defense & tree traversal',
    icon: FileCode,
  },
  {
    id: 2,
    title: 'Language & Filter Scan',
    desc: 'Classifying code extensions & pruning binaries',
    icon: Layers,
  },
  {
    id: 3,
    title: 'AST Symbol Chunking',
    desc: 'Extracting functions, classes & exact-line bounds',
    icon: Code2,
  },
  {
    id: 4,
    title: 'Inverted Index Assembly',
    desc: 'Building BM25 tokenizer & search index matrix',
    icon: Cpu,
  },
];

const TERMINAL_LOGS = [
  '[IO] Resolving archive root and verifying directory structure...',
  '[Security] ZIP-slip validation passed: 0 malicious segments detected.',
  '[Filters] Pruned excluded directories (dist/, node_modules/, .git/).',
  '[AST] Parsing Python AST syntax trees for class & function scopes...',
  '[Parser] Extracted top-level and nested method chunk boundaries.',
  '[AST] Regex parser processing TypeScript & JavaScript brace trees...',
  '[Chunker] Guaranteed exact-line invariant on all extracted chunks.',
  '[Index] Tokenizing lexical vocabulary and building BM25 index...',
  '[Ranking] Initializing hybrid retrieval scoring vectors (0.70/0.20/0.10)...',
  '[RAM Store] Repository index registered in memory store with clean isolation.',
];

export function IndexingOverlay({ isIndexing, indexingStep }) {
  const [activeStage, setActiveStage] = useState(1);
  const [logIndex, setLogIndex] = useState(0);

  // Progressive simulated pipeline stages
  useEffect(() => {
    if (!isIndexing) {
      setActiveStage(1);
      setLogIndex(0);
      return;
    }

    const stageTimer = setInterval(() => {
      setActiveStage((prev) => (prev < 4 ? prev + 1 : 4));
    }, 900);

    const logTimer = setInterval(() => {
      setLogIndex((prev) => (prev < TERMINAL_LOGS.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => {
      clearInterval(stageTimer);
      clearInterval(logTimer);
    };
  }, [isIndexing]);

  if (!isIndexing) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-cream/80 transition-all duration-300 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Repository Indexing in progress"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-cream-warm border border-cream-darker shadow-2xl overflow-hidden flex flex-col space-y-0 text-ink">
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-cream-darker bg-cream-dark/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-burg text-cream shadow-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">
                  Indexing & Chunking Repository
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-burg/10 text-brand-burg border border-brand-burg/20 animate-pulse">
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {indexingStep || 'Processing source files and extracting AST symbols…'}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-semibold text-brand-burg">
            <ShieldCheck className="w-4 h-4 text-brand-burg" />
            <span>Exact-Line Guarantee</span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6">
          {/* Visual 4-Stage Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const StageIcon = stage.icon;
              const isDone = activeStage > stage.id;
              const isCurrent = activeStage === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`relative p-3 rounded-xl border transition-all duration-300 flex flex-col items-center text-center space-y-2 ${
                    isCurrent
                      ? 'bg-cream-dark border-brand-burg shadow-md scale-[1.02]'
                      : isDone
                      ? 'bg-cream border-brand-burg/20'
                      : 'bg-cream/40 border-cream-darker opacity-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-brand-burg text-cream shadow-md animate-pulse'
                        : isDone
                        ? 'bg-brand-burg/10 text-brand-burg'
                        : 'bg-cream-darker text-ink-muted'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <StageIcon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-ink">
                      {stage.title}
                    </span>
                    <span className="text-[10px] text-ink-muted leading-tight line-clamp-2">
                      {stage.desc}
                    </span>
                  </div>

                  {isCurrent && (
                    <div className="w-full bg-cream-darker h-1 rounded-full overflow-hidden mt-1">
                      <div className="bg-brand-burg h-full rounded-full animate-progress" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Simulated Live Developer Terminal */}
          <div className="rounded-xl overflow-hidden border border-cream-darker bg-cream shadow-inner text-xs font-mono">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-3 py-2 bg-cream-dark border-b border-cream-darker text-ink-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-burg inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-burgLight inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-gold inline-block" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink font-semibold pl-2">
                  <Terminal className="w-3.5 h-3.5 text-brand-burgLight" />
                  <span>repolens-chunker.log</span>
                </div>
              </div>
              <span className="text-[10px] text-ink-muted">UTF-8 • python-ast</span>
            </div>

            {/* Terminal log output */}
            <div className="p-3.5 max-h-36 overflow-y-auto space-y-1.5 text-[11px] select-text">
              {TERMINAL_LOGS.slice(0, logIndex + 1).map((log, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 leading-relaxed text-ink"
                >
                  <span className="text-brand-burgLight select-none font-bold">
                    &gt;
                  </span>
                  <span
                    className={
                      i === logIndex
                        ? 'text-brand-burg font-semibold'
                        : 'text-ink-muted'
                    }
                  >
                    {log}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1 text-brand-burgLight animate-pulse pt-0.5">
                <span>▋</span>
                <span className="text-[10px] text-ink-muted">
                  Chunking AST nodes…
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-cream-darker bg-cream-dark/40 flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-burg" />
            <span className="font-sans">
              Code chunks are capped at 80-120 lines to optimize LLM grounded retrieval.
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-ink">
            Stage {activeStage} of 4
          </span>
        </div>
      </div>
    </div>
  );
}
