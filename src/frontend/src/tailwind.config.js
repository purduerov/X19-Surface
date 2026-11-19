/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./src/templates/**/*.html",
    "./static/**/*.js",
    "./src/static/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        rov: {
          dark: '#02142b',
          panel: '#001c38',
          item: '#01284f',
          border: '#033a66',
          accent: '#00e6ff',
          btn: '#01426e',
          'btn-hover': '#0167ae',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
      },
      zIndex: {
        modal: '3000',
      }
    },
  },
  plugins: [],
}
