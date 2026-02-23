```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo-600
        secondary: '#6366F1', // Indigo-500
        accent: '#EC4899', // Pink-500
        background: '#F9FAFB', // Gray-50
        text: '#1F2937', // Gray-800
        'text-light': '#6B7280', // Gray-500
        border: '#E5E7EB', // Gray-200
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```