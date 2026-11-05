const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Ethiopic', 'Nyala', 'Abyssinica SIL', ...defaultTheme.fontFamily.sans],
        serif: ['Georgia', 'Noto Sans Ethiopic', 'Nyala', 'Abyssinica SIL', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        brand: {
          forest: { ...colors.emerald, 700: '#075b42' },
          gold: { ...colors.amber, 400: '#d6a31b', 700: '#92400e' },
          canvas: 'rgb(var(--brand-canvas) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted) / <alpha-value>)',
          heading: 'rgb(var(--brand-heading) / <alpha-value>)',
        },
        'school-primary': 'var(--primary)',
        'school-secondary': 'var(--secondary)',
        'school-accent': 'var(--accent)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
