/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-pending': '#FBBF24',
        'status-active': '#10B981',
        'status-waitlist': '#3B82F6',
        'status-rejected': '#EF4444',
      }
    },
  },
  plugins: [],
}
