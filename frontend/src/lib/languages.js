// Language mappings for display names, badges, and prism syntax highlighter

export const LANGUAGE_MAP = {
  python: {
    name: 'Python',
    prism: 'python',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
  },
  typescript: {
    name: 'TypeScript',
    prism: 'typescript',
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
  },
  javascript: {
    name: 'JavaScript',
    prism: 'javascript',
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  rust: {
    name: 'Rust',
    prism: 'rust',
    bg: 'bg-orange-100',
    text: 'text-orange-900',
    border: 'border-orange-300',
  },
  go: {
    name: 'Go',
    prism: 'go',
    bg: 'bg-cyan-100',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
  },
  java: {
    name: 'Java',
    prism: 'java',
    bg: 'bg-red-100',
    text: 'text-red-900',
    border: 'border-red-300',
  },
  cpp: {
    name: 'C++',
    prism: 'cpp',
    bg: 'bg-indigo-100',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
  },
  c: {
    name: 'C',
    prism: 'c',
    bg: 'bg-slate-200',
    text: 'text-slate-900',
    border: 'border-slate-400',
  },
  html: {
    name: 'HTML',
    prism: 'markup',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
  },
  css: {
    name: 'CSS',
    prism: 'css',
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    border: 'border-sky-300',
  },
  json: {
    name: 'JSON',
    prism: 'json',
    bg: 'bg-stone-200',
    text: 'text-stone-900',
    border: 'border-stone-400',
  },
  markdown: {
    name: 'Markdown',
    prism: 'markdown',
    bg: 'bg-stone-200',
    text: 'text-stone-900',
    border: 'border-stone-400',
  },
};

export function getLanguageInfo(lang) {
  if (!lang) {
    return {
      name: 'Plain Text',
      prism: 'clike',
      bg: 'bg-stone-200',
      text: 'text-stone-900',
      border: 'border-stone-400',
    };
  }
  const key = String(lang).toLowerCase().trim();
  return LANGUAGE_MAP[key] || {
    name: key.toUpperCase(),
    prism: key,
    bg: 'bg-stone-200',
    text: 'text-stone-900',
    border: 'border-stone-400',
  };
}

export const KIND_MAP = {
  function: {
    label: 'function',
    bg: 'bg-purple-100 text-purple-950 border-purple-300',
    badge: 'fn',
  },
  class: {
    label: 'class',
    bg: 'bg-amber-100 text-amber-950 border-amber-300',
    badge: 'cls',
  },
  method: {
    label: 'method',
    bg: 'bg-blue-100 text-blue-950 border-blue-300',
    badge: 'mth',
  },
  module: {
    label: 'module',
    bg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    badge: 'mod',
  },
  block: {
    label: 'block',
    bg: 'bg-stone-200 text-stone-900 border-stone-300',
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
    bg: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  symbol: {
    label: 'symbol',
    description: 'Match in function/class name',
    bg: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  path: {
    label: 'path',
    description: 'Match in directory or filename',
    bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  semantic: {
    label: 'semantic',
    description: 'Embedding vector similarity',
    bg: 'bg-pink-100 text-pink-900 border-pink-300',
  },
};
