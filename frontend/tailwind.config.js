/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'federation': '#3399ff',
        'klingon': '#cc0000',
        'romulan': '#006600',
        'cardassian': '#996633',
        'ferengi': '#ff9900',
        'breen': '#66cccc',
        'gorn': '#88aa33',
        'lcars-orange': '#ff9900',
        'lcars-blue': '#9999ff',
        'lcars-purple': '#cc99cc',
        'lcars-tan': '#ffcc99',
        'space-dark': '#0a0a12',
        'space-blue': '#1a1a2e',
      },
      fontFamily: {
        'lcars': ['Antonio', 'sans-serif'],
        'trek': ['Okuda', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
