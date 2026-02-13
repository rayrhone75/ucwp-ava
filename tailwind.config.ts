import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ava: {
          bg: '#0a0a0f',
          surface: '#18181b',
          border: '#27272a',
          accent: '#8b5cf6',
          'accent-hover': '#7c3aed',
        },
      },
    },
  },
  plugins: [],
};

export default config;
