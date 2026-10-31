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
        brand: {
          burg:      '#6B1A2A',
          burgDark:  '#4A0E1C',
          burgLight: '#8B2A3C',
          gold:      '#B8860B',
        },
        cream: {
          DEFAULT: '#FAF6F0',
          dark:    '#F0E8DC',
          darker:  '#E4D5C4',
          warm:    '#FEFCFA',
        },
        ink: {
          DEFAULT: '#1C0A0D',
          muted:   '#6B4C52',
          faint:   '#9B7A82',
        },
        success: '#2D6A4F',
        danger:  '#C0392B',
      },
      fontFamily: {
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
