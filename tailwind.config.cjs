/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FBBF24", // Âmbar / amarelo dourado premium
        secondary: "#0A2540", // Azul escuro corporativo
        accent: "#10B981", // Verde esmeralda para status ativos/online
        surface: "#111827", // Cinza escuro para componentes dark
        "surface-dark": "#030712", // Preto profundo para fundo escuro do mapa/plataforma
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
