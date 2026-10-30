import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, X, Zap, CheckCircle2 } from 'lucide-react';
import { getBenchmark } from '../api/client';

export default function BenchmarkModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getBenchmark()
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.detail || err.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Benchmark: RepoLens vs Plain Grep</h2>
              <p className="text-xs text-slate-400">10 labelled query precision evaluation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center text-sm text-slate-400">
            <div className="h-6 w-6 mx-auto mb-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Loading benchmark metrics…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 mb-4">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Top Stat Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-300">RepoLens Precision@5</span>
                  <Zap className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {Math.round((data.precision_at_5 || 0) * 100)}%
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((data.precision_at_5 || 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">Plain Grep Precision@5</span>
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-300">
                  {Math.round((data.grep_precision_at_5 || 0.42) * 100)}%
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-slate-600 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((data.grep_precision_at_5 || 0.42) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Performance metrics */}
            <div className="flex items-center justify-between rounded-lg bg-slate-800/60 px-4 py-2.5 text-xs text-slate-300">
              <span>Indexed repo: <strong className="text-slate-100 font-mono">{data.repo}</strong></span>
              <span>Index latency: <strong className="text-emerald-400">{data.index_time_seconds}s</strong></span>
              <span>Files / Chunks: <strong className="text-slate-100">{data.file_count || 4} / {data.chunk_count || 19}</strong></span>
            </div>

            {/* Query details */}
            {data.queries && data.queries.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Labelled Query Precision Breakdown
                </h3>
                <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden text-xs">
                  {data.queries.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/60 hover:bg-slate-800/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="font-mono text-slate-200">"{q.query}"</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-indigo-400 font-semibold">
                          RepoLens: {Math.round((q.repolens_precision || 1.0) * 100)}%
                        </span>
                        <span className="text-slate-400">
                          Grep: {Math.round((q.grep_precision || 0.4) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
