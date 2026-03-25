import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0e27',
        'dark-card': '#1a1f3a',
        'accent-blue': '#00d4ff',
        'accent-blue-dark': '#0099cc',
        'alert-orange': '#ff8c42',
        'alert-red': '#ff3b3b',
        'text-primary': '#f0f0f0',
        'text-secondary': '#a0a0a0',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'train-move': 'train-move 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'train-move': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
