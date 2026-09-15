/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14202B',
          muted: '#5C6B7A',
          faint: '#8A97A5',
        },
        paper: {
          DEFAULT: '#F2F5F8',
          surface: '#FBFCFD',
        },
        ruled: {
          DEFAULT: '#D5DEE8',
          soft: '#E8EEF4',
        },
        petrol: {
          50: '#E8F4F5',
          100: '#D1E9EC',
          200: '#A3D3D9',
          300: '#6FB5BE',
          400: '#3D929D',
          500: '#0A6B75',
          600: '#085A62',
          700: '#064A51',
          800: '#053A40',
          900: '#032B30',
          DEFAULT: '#0A6B75',
        },
        stamp: {
          DEFAULT: '#B83228',
          soft: '#F8E8E6',
          ink: '#8F261E',
        },
        pass: {
          DEFAULT: '#2F6B4F',
          soft: '#E6F0EB',
          ink: '#245540',
        },
        warn: {
          DEFAULT: '#A16207',
          soft: '#FEF6E7',
          ink: '#854D0E',
        },
        // Compat: maps antigos brand-* → petrol (evita quebras em arquivos ainda não migrados)
        brand: {
          50: '#E8F4F5',
          100: '#D1E9EC',
          200: '#A3D3D9',
          300: '#6FB5BE',
          400: '#3D929D',
          500: '#0A6B75',
          600: '#085A62',
          700: '#064A51',
          800: '#053A40',
          900: '#032B30',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        tape: '0 1px 0 0 #D5DEE8, 0 8px 24px -12px rgba(20, 32, 43, 0.18)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
