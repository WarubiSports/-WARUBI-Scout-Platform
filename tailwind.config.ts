import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco',
          'Consolas', 'Liberation Mono', 'Courier New', 'monospace',
        ],
      },
      colors: {
        scout: {
          950: '#05080f',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          accent: '#10b981',
          highlight: '#fbbf24',
          warning: '#ef4444',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'signal-glow': 'signal-glow 2s infinite',
        'marquee': 'marquee 40s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
      },
      keyframes: {
        'signal-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(16, 185, 129, 0.2)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
          },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
