/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors for a surveillance/monitoring UI feel
        surface: {
          DEFAULT: '#0f1419',   // Main background — very dark
          card: '#1a1f2e',      // Card/panel background
          hover: '#242b3d',     // Hover state
          border: '#2d3548',    // Border color
        },
        accent: {
          DEFAULT: '#3b82f6',   // Primary blue
          hover: '#2563eb',     // Blue on hover
          glow: '#3b82f680',    // Blue with 50% opacity for glows
        },
      },
    },
  },
  plugins: [],
};
