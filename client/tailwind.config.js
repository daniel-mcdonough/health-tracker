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
        digestive: '#F59E0B',
        energy: '#10B981',
        mood: '#8B5CF6',
        pain: '#EF4444',
        sleep: '#3B82F6',
      }
    },
  },
  plugins: [],
}