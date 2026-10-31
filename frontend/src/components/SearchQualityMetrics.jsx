import React, { useEffect, useState } from 'react';
import { Activity, Target } from 'lucide-react';
import { getBenchmark } from '../api/client';

function percentage(value) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

export function SearchQualityMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getBenchmark()
      .then((result) => {
        if (active) setMetrics(result);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.detail ||
              requestError.message ||
              'Evaluation metrics are unavailable.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const queries = metrics?.queries;
  const queryCount = Array.isArray(queries) ? queries.length : 0;
  const queryAccuracy =
    queryCount > 0
      ? queries.filter((query) => query.repolens_precision > 0).length /
        queryCount
      : null;

  return (
    <section
      aria-label="Search quality metrics"
      className="space-y-2 border-t border-cream-darker/70 pt-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Activity className="h-3.5 w-3.5 text-brand-burg" />
          <span>Search Quality</span>
        </div>
        {metrics && (
          <span className="text-[10px] font-mono text-ink-faint">
            {queryCount} test queries
          </span>
        )}
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-lg border border-cream-darker bg-cream p-2.5"
            title="Average fraction of the top five results that were relevant in the evaluation."
          >
            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
              <Target className="h-3 w-3 text-brand-burg" />
              <span>Precision@5</span>
            </div>
            <div className="mt-1 text-lg font-bold text-brand-burg">
              {percentage(metrics.precision_at_5)}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-cream-darker">
              <div
                className="h-full rounded-full bg-brand-burg"
                style={{ width: percentage(metrics.precision_at_5) }}
              />
            </div>
          </div>

          <div
            className="rounded-lg border border-cream-darker bg-cream p-2.5"
            title="Share of evaluated queries with at least one relevant result in the top five."
          >
            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
              <Target className="h-3 w-3 text-brand-burgLight" />
              <span>Query accuracy</span>
            </div>
            <div className="mt-1 text-lg font-bold text-brand-burg">
              {queryAccuracy === null ? '—' : percentage(queryAccuracy)}
            </div>
            {queryAccuracy !== null && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-cream-darker">
                <div
                  className="h-full rounded-full bg-brand-burgLight"
                  style={{ width: percentage(queryAccuracy) }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p
          className={`rounded-lg border p-2.5 text-[11px] ${
            error
              ? 'border-brand-burg/20 bg-brand-burg/5 text-brand-burg'
              : 'border-cream-darker bg-cream text-ink-muted'
          }`}
          role={error ? 'status' : undefined}
        >
          {error || 'Loading evaluation metrics…'}
        </p>
      )}

      {metrics && queryAccuracy !== null && (
        <p className="text-[10px] leading-relaxed text-ink-faint">
          Query accuracy counts searches with at least one relevant top-five
          result. Evaluation: {metrics.repo || 'sample repository'}.
        </p>
      )}
    </section>
  );
}
