```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // Blue-500
        secondary: '#6EE7B7', // Emerald-300
        accent: '#FCD34D', // Amber-300
        dark: '#1F2937', // Gray-800
        light: '#F9FAFB', // Gray-50
      },
    },
  },
  plugins: [],
}
```