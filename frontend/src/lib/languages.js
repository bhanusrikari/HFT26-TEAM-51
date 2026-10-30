// Language mappings for display names, badges, and prism syntax highlighter

export const LANGUAGE_MAP = {
  python: {
    name: 'Python',
    prism: 'python',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
  },
  typescript: {
    name: 'TypeScript',
    prism: 'typescript',
    bg: 'bg-blue-950/60',
    text: 'text-blue-400',
    border: 'border-blue-800/60',
  },
  javascript: {
    name: 'JavaScript',
    prism: 'javascript',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
  },
  rust: {
    name: 'Rust',
    prism: 'rust',
    bg: 'bg-orange-950/60',
    text: 'text-orange-400',
    border: 'border-orange-800/60',
  },
  go: {
    name: 'Go',
    prism: 'go',
    bg: 'bg-cyan-950/60',
    text: 'text-cyan-400',
    border: 'border-cyan-800/60',
  },
  java: {
    name: 'Java',
    prism: 'java',
    bg: 'bg-red-950/60',
    text: 'text-red-400',
    border: 'border-red-800/60',
  },
  cpp: {
    name: 'C++',
    prism: 'cpp',
    bg: 'bg-indigo-950/60',
    text: 'text-indigo-400',
    border: 'border-indigo-800/60',
  },
  c: {
    name: 'C',
    prism: 'c',
    bg: 'bg-slate-950/60',
    text: 'text-slate-400',
    border: 'border-slate-800/60',
  },
  html: {
    name: 'HTML',
    prism: 'markup',
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    border: 'border-rose-800/60',
  },
  css: {
    name: 'CSS',
    prism: 'css',
    bg: 'bg-sky-950/60',
    text: 'text-sky-400',
    border: 'border-sky-800/60',
  },
  json: {
    name: 'JSON',
    prism: 'json',
    bg: 'bg-zinc-900',
    text: 'text-zinc-400',
    border: 'border-zinc-700',
  },
  markdown: {
    name: 'Markdown',
    prism: 'markdown',
    bg: 'bg-neutral-900',
    text: 'text-neutral-400',
    border: 'border-neutral-700',
  },
};

export function getLanguageInfo(lang) {
  if (!lang) {
    return {
      name: 'Plain Text',
      prism: 'clike',
      bg: 'bg-gray-900',
      text: 'text-gray-400',
      border: 'border-gray-700',
    };
  }
  const key = String(lang).toLowerCase().trim();
  return LANGUAGE_MAP[key] || {
    name: key.toUpperCase(),
    prism: key,
    bg: 'bg-gray-900',
    text: 'text-gray-300',
    border: 'border-gray-700',
  };
}

export const KIND_MAP = {
  function: {
    label: 'function',
    bg: 'bg-purple-950/60 text-purple-300 border-purple-800/70',
    badge: 'fn',
  },
  class: {
    label: 'class',
    bg: 'bg-amber-950/60 text-amber-300 border-amber-800/70',
    badge: 'cls',
  },
  method: {
    label: 'method',
    bg: 'bg-blue-950/60 text-blue-300 border-blue-800/70',
    badge: 'mth',
  },
  module: {
    label: 'module',
    bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70',
    badge: 'mod',
  },
  block: {
    label: 'block',
    bg: 'bg-slate-800/70 text-slate-300 border-slate-700',
    badge: 'blk',
  },
};

export function getKindInfo(kind) {
  const k = (kind || 'block').toLowerCase();
  return KIND_MAP[k] || KIND_MAP.block;
}

export const MATCH_REASON_MAP = {
  lexical: {
    label: 'lexical',
    description: 'Exact keyword match in code tokens',
    bg: 'bg-blue-950/50 text-blue-400 border-blue-800/40',
  },
  symbol: {
    label: 'symbol',
    description: 'Match in function/class name',
    bg: 'bg-purple-950/50 text-purple-400 border-purple-800/40',
  },
  path: {
    label: 'path',
    description: 'Match in directory or filename',
    bg: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40',
  },
  semantic: {
    label: 'semantic',
    description: 'Embedding vector similarity',
    bg: 'bg-pink-950/50 text-pink-400 border-pink-800/40',
  },
};

