/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#09090b',
        surface: {
          DEFAULT: '#18181b',
          elevated: '#202024',
        },
        border: {
          DEFAULT: '#27272a',
          active: '#3f3f46',
        },
        fg: {
          primary: '#fafafa',
          muted: '#a1a1aa',
          disabled: '#71717a',
        },
        emerald: {
          DEFAULT: '#10b981',
        },
        rose: {
          DEFAULT: '#e11d48',
        },
        accent: {
          DEFAULT: '#3b82f6',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        geist: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '0.125rem',
        DEFAULT: '0.25rem', // Base Radius 4px
        md: '0.375rem',
        lg: '0.5rem',       // Subtle Card Radius 8px
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}
