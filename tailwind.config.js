export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0)   scale(1)'    },
        },
        'fade-in-down': {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'     },
        },
      },
      animation: {
        'fade-in-up':   'fade-in-up   0.22s ease-out both',
        'fade-in-down': 'fade-in-down 0.18s ease-out both',
      },
    },
  },
  plugins: [],
}
