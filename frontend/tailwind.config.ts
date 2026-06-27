import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    { pattern: /^bg-bits-/ },
    { pattern: /^text-bits-/ },
    { pattern: /^border-bits-/ },
    { pattern: /^hover:bg-bits-/ },
    { pattern: /^hover:text-bits-/ },
    { pattern: /^hover:border-bits-/ },
    { pattern: /^focus-within:border-bits-/ },
    { pattern: /^placeholder-bits-/ },
  ],
  theme: {
    extend: {
      colors: {
        gray: { 750: '#2a3141', 850: '#1a2030', 950: '#030712' },
        bits: {
          bg:     '#071224',
          panel:  '#0d1f35',
          deep:   '#0a1628',
          border: '#1e3a5f',
          border2:'#2a4f7a',
          accent: '#4a9eff',
          text:   '#7a9cc4',
          muted:  '#4a6080',
          gold:   '#C4922A',
          hover:  '#1e3a5f',
          btn:    '#1a5fb4',
          btnhov: '#2270cc',
        },
      },
    },
  },
  plugins: [],
};

export default config;
