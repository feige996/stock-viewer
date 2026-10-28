/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        up: '#ef4444', // 红涨 (中国红)
        down: '#22c55e', // 绿跌
        flat: '#9ca3af',
      },
    },
  },
  plugins: [],
}
