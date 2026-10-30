# RepoLens — Frontend & UX

> Evidence-based code exploration tool for developers (Team **CodeRed**).

RepoLens indexes codebases from ZIP archives or public GitHub repositories and allows developers to query them using natural language. This frontend displays ranked code snippets with file paths, line ranges, symbols, match reasons, syntax highlighting, and an AI explanation grounded directly in the retrieved evidence with interactive citations.

---

## 🛠️ Tech Stack

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
- `VITE_USE_MOCK`: Set to `true` to use realistic offline fixtures without running the backend. Set to `false` to communicate with the FastAPI backend.
- `VITE_API_BASE`: Relative path to API root (default: `/api`).
- `VITE_BACKEND_TARGET`: Backend URL for Vite dev server proxy (default: `http://localhost:8000`).

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

## 🔄 Mock Mode vs Real Backend Switch

Because the backend is developed in parallel, the frontend features **full standalone mock fidelity**:

1. **Via Environment Variable** (per contract requirement):
   - In `frontend/.env`:
     ```env
     # Enable Mock Mode
     VITE_USE_MOCK=true

     # Or Disable Mock Mode to connect to FastAPI at http://localhost:8000
     VITE_USE_MOCK=false
     ```
   - Restart the Vite dev server (`npm run dev`).

2. **Via In-App Dev Tools Pill**:
   - In the top header, click the **Mock Mode** / **Live Mode** badge.
   - You can toggle between live and mock on the fly.
   - You can also simulate backend edge cases:
     - **Clean 200 OK**: Normal search with grounded explanations and citations `[1]`, `[2]`.
     - **Empty results**: 0 matching snippets state.
     - **Explanation Error**: Returns code snippets normally while surfacing `explanation_error` (e.g. LLM quota / timeout).
     - **404 Not Found**: Simulated missing or expired repository ID with re-index prompt.
     - **502 Bad Gateway**: Upstream GitHub rate limit or server crash banner with retry.

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

All fetch calls in `src/api/client.js` use the relative path `/api/...`, meaning:
- `http://localhost:5173/api/health` -> proxied to `http://localhost:8000/api/health`
- `http://localhost:5173/api/repositories/upload` -> proxied to `http://localhost:8000/api/repositories/upload`
- `http://localhost:5173/api/repositories/github` -> proxied to `http://localhost:8000/api/repositories/github`
- `http://localhost:5173/api/repositories/{repo_id}` -> proxied to `http://localhost:8000/api/repositories/{repo_id}`
- `http://localhost:5173/api/search` -> proxied to `http://localhost:8000/api/search`

---

## 🔌 API Endpoints Implemented

| Endpoint | Method | Payload / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | — | Backend health polling (every 15s) |
| `/api/repositories/upload` | `POST` | `multipart/form-data` (`file` field, `.zip`) | Index uploaded ZIP archive |
| `/api/repositories/github` | `POST` | `application/json` (`{"url": "..."}`) | Index public GitHub repo |
| `/api/repositories/{repo_id}` | `GET` | — | Fetch detailed repo stats, languages & skipped files |
| `/api/search` | `POST` | `application/json` (`{"repo_id","query","top_k","explain"}`) | Search index & generate grounded explanation |

---

## ♿ Accessibility & Polish

- Full keyboard navigation for cards and code viewers.
- Contrast compliant dark palette (GitHub Dark `#0d1117`, `#161b22`, `#30363d`).
- `@media (prefers-reduced-motion)` respected across all animations.
- Interactive `[1]`, `[2]` citations in AI explanation scroll to and trigger a CSS pulse ring on target code snippet cards.
- Line numbers starting accurately at `start_line` for every code snippet.
- Responsive breakpoints at 375px (mobile accordion), 768px (tablet), and 1280px+ (desktop).

