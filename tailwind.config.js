/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#14212b', 700: '#2c3e4c', 500: '#5b6f7e', 300: '#b4c0c9', 100: '#e6ecf0', 50: '#f2f5f7' },
        signal: { 700: '#0b5c78', 600: '#0f7396', 500: '#1b8fb6', 100: '#d9eef6' },
      },
    },
  },
  plugins: [],
};
