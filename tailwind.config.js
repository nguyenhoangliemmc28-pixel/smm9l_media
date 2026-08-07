/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D5BFF',
          50: '#EFEDFF',
          100: '#E1DDFF',
          200: '#C4BCFF',
          300: '#A799FF',
          400: '#8A6DFF',
          500: '#6D5BFF',
          600: '#5743E8',
          700: '#4533BF',
          800: '#332590',
          900: '#221861',
        },
        accent: {
          DEFAULT: '#6EE7FF',
          400: '#7FEFFF',
          500: '#6EE7FF',
          600: '#3CC8E8',
        },
        success: { DEFAULT: '#22C55E' },
        danger: { DEFAULT: '#EF4444' },
        warning: { DEFAULT: '#F59E0B' },
        bg: {
          base: '#07070A',
          card: '#111118',
          cardHover: '#151522',
          sidebar: '#0B0B11',
          navbar: 'rgba(16,16,24,.75)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,.08)',
          strong: 'rgba(255,255,255,.14)',
        },
        muted: 'rgba(255,255,255,.65)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '12px',
        input: '14px',
        card: '20px',
        modal: '24px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      boxShadow: {
        glow: '0 0 30px -5px rgba(109,91,255,.35)',
        'glow-accent': '0 0 30px -5px rgba(110,231,255,.35)',
        card: '0 8px 30px -10px rgba(0,0,0,.6)',
      },
      backdropBlur: {
        xs: '4px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fade-in 300ms ease-out',
      },
    },
  },
  plugins: [],
};
