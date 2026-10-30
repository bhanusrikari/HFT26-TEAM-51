/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0d1117',
          surface: '#161b22',
          subtle: '#21262d',
          border: '#30363d',
          muted: '#8b949e',
          text: '#c9d1d9',
          bright: '#f0f6fc',
        },
        brand: {
          blue: '#58a6ff',
          hover: '#79c0ff',
          green: '#238636',
          greenLight: '#3fb950',
          purple: '#a371f7',
          amber: '#d29922',
          red: '#f85149',
        }
      },
      fontFamily: {
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

