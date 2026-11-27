/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#5145E5',
          'primary-deep': '#3730A3',
          'primary-dark': '#4338CA',
          'primary-bright': '#6366F1',
          'primary-light': '#818CF8',
          'primary-soft': '#EEF2FF',
          'primary-surface': '#E0E7FF',
          'primary-border': '#C7D2FE',
          secondary: '#7C3AED',
          'secondary-deep': '#5B21B6',
          'secondary-dark': '#6D28D9',
          'secondary-bright': '#9333EA',
          'secondary-light': '#A78BFA',
          'secondary-soft': '#F5F0FF',
          'secondary-surface': '#EDE9FE',
          'secondary-border': '#DDD6FE',
        },
        surface: {
          app: '#F8F9FC',
          primary: '#FFFFFF',
          secondary: '#F5F6FC',
          tertiary: '#F0F2F8',
          cool: '#F0F3FF',
          violet: '#F6F1FF',
          muted: '#F3F4F6',
          inverse: '#151525',
        },
        text: {
          primary: '#151525',
          secondary: '#55566F',
          muted: '#85869B',
          subtle: '#A1A1B5',
          disabled: '#B8BAC9',
          inverse: '#FFFFFF',
          brand: '#5145E5',
          'brand-secondary': '#7C3AED',
          link: '#4F46E5',
          'link-hover': '#3730A3',
        },
        border: {
          subtle: '#E6E8F0',
          hover: '#C5C8D8',
          highlight: '#C7D2FE',
          brand: '#5145E5',
        },
      },
    },
  },
  plugins: [],
};
