/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'inovintell-blue': '#0045FF',
        'inovintell-green': '#00FF99',
        'inovintell-gradient-start': '#0045FF',
        'inovintell-gradient-end': '#00FF99',
      },
      backgroundImage: {
        'inovintell-gradient': 'linear-gradient(135deg, #0045FF 0%, #00FF99 100%)',
      },
    },
  },
  plugins: [],
}