/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modo Claro
        background: {
          light: '#F7F8FA',
          dark: '#0D1117',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#161B22',
        },
        border: {
          light: '#E6E8EC',
          dark: '#262C36',
        },
        content: {
          main: {
            light: '#12161C',
            dark: '#E6EDF3',
          },
          secondary: {
            light: '#5B6472',
            dark: '#8B95A5',
          },
        },
        primary: {
          DEFAULT: '#0E9F6E',
          hover: '#0B8A5F',
          light: '#DEF7EC',
          dark: '#057A55',
        },
        accent: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#E0E7FF',
        },
        income: '#0E9F6E',
        expense: '#E5484D',
        warning: '#F5A524',
        traffic: {
          green: '#0E9F6E',
          yellow: '#F5A524',
          red: '#E5484D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        'xl': '12px',
      },
    },
  },
  plugins: [],
}
