/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--canvas)',
        surface: 'var(--surface-2)',
        border: 'var(--border-soft)',
        primary: 'var(--accent)',
        'primary-hover': 'var(--accent)',
      }
    },
  },
  plugins: [],
}
