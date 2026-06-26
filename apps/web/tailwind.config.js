/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4d977c', // sliced elephant green / primary
          green: '#4d977c',
          orange: '#fe5c4a', // CTA
          blue: '#6ca5c3', // secondary
        },
        ink: '#1c2833', // headings / dark text
        slate2: '#5d6d7e',
        mist: '#f4f6f6',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,40,51,0.04), 0 8px 24px rgba(28,40,51,0.08)',
      },
    },
  },
  plugins: [],
};
