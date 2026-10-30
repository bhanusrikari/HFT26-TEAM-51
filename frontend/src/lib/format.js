// Formatting helper functions for RepoLens

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString();
}

export function formatScore(score) {
  if (score === undefined || score === null || isNaN(score)) return { scoreStr: '0.00', percent: 0 };
  const s = Math.max(0, Math.min(1, Number(score)));
  return {
    scoreStr: s.toFixed(2),
    percent: Math.round(s * 100),
  };
}

export function formatLineRange(startLine, endLine) {
  if (!startLine && !endLine) return 'Lines 1–1';
  if (startLine === endLine) return `Line ${startLine}`;
  return `Lines ${startLine}–${endLine}`;
}

