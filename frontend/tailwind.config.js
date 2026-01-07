/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        success: '#22c55e',
        background: '#0f0f23',
        surface: '#1a1a2e',
        text: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
