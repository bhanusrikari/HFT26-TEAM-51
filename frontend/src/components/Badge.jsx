import React from 'react';
import { getKindInfo, getLanguageInfo, MATCH_REASON_MAP } from '../lib/languages';

export function KindBadge({ kind }) {
  const info = getKindInfo(kind);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${info.bg}`}
      title={`Code kind: ${info.label}`}
    >
      <span className="opacity-75 mr-1 font-bold">{info.badge}</span>
      {info.label}
    </span>
  );
}

export function LanguageBadge({ language }) {
  const info = getLanguageInfo(language);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${info.bg} ${info.text} ${info.border}`}
      title={`Language: ${info.name}`}
    >
      {info.name}
    </span>
  );
}

export function MatchReasonChip({ reason }) {
  const key = String(reason || '').toLowerCase();
  const info = MATCH_REASON_MAP[key] || {
    label: key,
    description: 'Match reason',
    bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border ${info.bg}`}
      title={info.description}
    >
      {info.label}
    </span>
  );
}

