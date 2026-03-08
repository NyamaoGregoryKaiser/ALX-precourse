```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1', // Indigo 500
        secondary: '#818CF8', // Indigo 400
        accent: '#EC4899', // Pink 500
        background: '#1F2937', // Gray 800
        surface: '#374151', // Gray 700
        text: '#F9FAFB', // Gray 50
        textSecondary: '#D1D5DB', // Gray 300
        border: '#4B5563', // Gray 600
        success: '#10B981', // Green 500
        danger: '#EF4444', // Red 500
        warning: '#F59E0B', // Yellow 500
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: 1 },
          '100%': { transform: 'translateX(-100%)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
```