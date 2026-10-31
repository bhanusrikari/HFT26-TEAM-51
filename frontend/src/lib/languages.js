// Language mappings for display names, badges, and prism syntax highlighter

export const LANGUAGE_MAP = {
  python: {
    name: 'Python',
    prism: 'python',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  typescript: {
    name: 'TypeScript',
    prism: 'typescript',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  javascript: {
    name: 'JavaScript',
    prism: 'javascript',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  rust: {
    name: 'Rust',
    prism: 'rust',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  go: {
    name: 'Go',
    prism: 'go',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  java: {
    name: 'Java',
    prism: 'java',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  cpp: {
    name: 'C++',
    prism: 'cpp',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  c: {
    name: 'C',
    prism: 'c',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  html: {
    name: 'HTML',
    prism: 'markup',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  css: {
    name: 'CSS',
    prism: 'css',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  json: {
    name: 'JSON',
    prism: 'json',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
  markdown: {
    name: 'Markdown',
    prism: 'markdown',
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  },
};

export function getLanguageInfo(lang) {
  if (!lang) {
    return {
      name: 'Plain Text',
      prism: 'clike',
      bg: 'bg-cream-dark',
      text: 'text-brand-burg',
      border: 'border-cream-darker',
    };
  }
  const key = String(lang).toLowerCase().trim();
  return LANGUAGE_MAP[key] || {
    name: key.toUpperCase(),
    prism: key,
    bg: 'bg-cream-dark',
    text: 'text-brand-burg',
    border: 'border-cream-darker',
  };
}

export const KIND_MAP = {
  function: {
    label: 'function',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
    badge: 'fn',
  },
  class: {
    label: 'class',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
    badge: 'cls',
  },
  method: {
    label: 'method',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
    badge: 'mth',
  },
  module: {
    label: 'module',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
    badge: 'mod',
  },
  block: {
    label: 'block',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
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
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
  },
  symbol: {
    label: 'symbol',
    description: 'Match in function/class name',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
  },
  path: {
    label: 'path',
    description: 'Match in directory or filename',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
  },
  semantic: {
    label: 'semantic',
    description: 'Embedding vector similarity',
    bg: 'bg-cream-dark text-brand-burg border-cream-darker',
  },
};
