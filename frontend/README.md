# RepoLens — Frontend & UX

> Evidence-based code exploration tool for developers (Team **CodeRed**).

RepoLens indexes codebases from ZIP archives or public GitHub repositories and allows developers to query them using natural language. This frontend displays ranked code snippets with file paths, line ranges, symbols, match reasons, syntax highlighting, and an AI explanation grounded directly in the retrieved evidence with interactive citations.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS v3 (GitHub Dark / VS Code developer palette)
- **Code Syntax Highlighting**: Prism OneDark via `prism-react-renderer`
- **Icons**: `lucide-react`
- **Architecture**: Zero heavy UI frameworks, responsive from mobile (375px) to desktop (1280px+), full keyboard accessibility.

---

## 🚀 Quickstart & Installation

### Prerequisites

- **Node.js**: v18+ (tested on v26 LTS)
- **npm**: v9+

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Environment variables:
- `VITE_USE_MOCK`: Defaults to `false` when unset. Only `"true"` enables mock mode. Set `VITE_USE_MOCK=true` to use realistic offline fixtures and simulation controls without running the backend.
- `VITE_API_BASE`: Relative path to API root (default: `/api`). Overrides the API base URL if needed.
- `VITE_BACKEND_TARGET`: Backend URL for Vite dev server proxy (default: `http://localhost:8000`).

Sign-in stores the entered email profile in browser localStorage. It is local-only
and does not verify identity or create a backend account.

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Production Build

```bash
npm run build
npm run preview
```

---

## 🔄 Mock Mode Configuration (`VITE_USE_MOCK`)

The frontend adheres to strict separation between mock fixtures and the live FastAPI backend:

- **Default Behavior (Real Backend)**:
  - When `VITE_USE_MOCK` is unset or set to `false`, the frontend connects directly to the FastAPI backend through the `/api` proxy.
  - The mock simulation toolbar is hidden.
- **Mock Mode (`VITE_USE_MOCK=true`)**:
  - When set to `true`, the frontend runs in self-contained mock mode with 3 pre-indexed repositories (`repolens-backend`, `auth-gateway-ts`, `minirust-kv-engine`), realistic Python/TypeScript code fixtures, grounded explanations with `[1]`, `[2]` citations, and 600–1200ms simulated latency.
  - Simulates authentication, per-user repositories, search history, and async indexing.
  - An in-app **Mock Simulation** popover becomes available in the header allowing developers and judges to simulate backend error states:
    - **Clean 200 OK**: Normal search with grounded explanations and citations `[1]`, `[2]`.
    - **Empty results**: 0 matching snippets state.
    - **Explanation Error**: Returns code snippets normally while surfacing `explanation_error` (e.g. LLM quota / timeout).
    - **404 Not Found**: Simulated missing or expired repository ID with re-index prompt.
    - **502 Bad Gateway**: Upstream GitHub rate limit or server crash banner with retry.
- **Switching**: The environment variable (`VITE_USE_MOCK`) is the sole toggle between mock and real backend.

---

## 🌐 Vite Proxy Details

In development, the Vite dev server automatically proxies all requests starting with `/api` to the backend:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

All fetch calls in `src/api/client.js` use `credentials: 'include'` to pass session cookies (`repolens_session`), and relative URLs (`/api/...` or `VITE_API_BASE`).

---

## 🔌 API Endpoints Implemented (v1 + v2)

| Endpoint | Method | Payload / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/auth/logout` | `POST` | — | Clear session cookie |
| `/api/auth/me` | `GET` | — | Get authenticated user info |
| `/api/repositories` | `GET` | — | List caller's indexed repositories |
| `/api/repositories/upload` | `POST` | `multipart/form-data` (`file`, `.zip`) | Index ZIP archive (async 202) |
| `/api/repositories/github` | `POST` | `application/json` (`{"url": "..."}`) | Index public GitHub repo (async 202) |
| `/api/repositories/{repo_id}` | `GET` | — | Fetch repo stats, status, progress, languages |
| `/api/search` | `POST` | `{"repo_id","query","top_k","explain","min_score"}` | Grounded code search with low-relevance count |
| `/api/history` | `GET` | `?repo_id={optional}` | User search history |

---

## ♿ Accessibility & Polish

- Full keyboard navigation for cards and code viewers.
- Consistent burgundy and cream palette across screens and dialogs.
- `@media (prefers-reduced-motion)` respected across all animations.
- Interactive `[1]`, `[2]` citations in AI explanation scroll to and trigger a CSS pulse ring on target code snippet cards.
- Line numbers starting accurately at `start_line` for every code snippet.
- Responsive breakpoints at 375px (mobile accordion), 768px (tablet), and 1280px+ (desktop).
