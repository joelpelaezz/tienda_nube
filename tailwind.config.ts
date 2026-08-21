import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        background: {
          DEFAULT: 'var(--color-bg)',
          muted: 'var(--color-bg-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        offer: {
          bg: 'var(--color-offer-bg)',
          text: 'var(--color-offer-text)',
        },
        social: {
          whatsapp: 'var(--color-whatsapp)',
          facebook: 'var(--color-facebook)',
          instagram: 'var(--color-instagram)',
        },
        input: {
          bg: 'var(--color-input-bg)',
          border: 'var(--color-input-border)',
        },
        success: 'var(--color-success)',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        'heading-1': ['28px', { lineHeight: '30.8px', letterSpacing: '2px', fontWeight: '700' }],
        'heading-2': ['18px', { lineHeight: '19.8px', letterSpacing: '2px', fontWeight: '700' }],
        'heading-3': ['18px', { lineHeight: '19.8px', letterSpacing: '2px', fontWeight: '700' }],
        'heading-4': ['18px', { lineHeight: '19.8px', letterSpacing: '2px', fontWeight: '700' }],
        'heading-5': ['14px', { lineHeight: '15.4px', letterSpacing: '2px', fontWeight: '700' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'paragraph': ['16px', { lineHeight: '22.86px', fontWeight: '400' }],
        'product-name': ['12px', { lineHeight: '18px', letterSpacing: '2px', fontWeight: '700' }],
        'price': ['18px', { lineHeight: '25.71px', letterSpacing: '2px', fontWeight: '400' }],
        'button': ['12px', { lineHeight: '30px', letterSpacing: '2px', fontWeight: '700' }],
        'nav-link': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'badge': ['9.1px', { lineHeight: '10.92px' }],
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'button-small': 'var(--shadow-button)',
        'dropdown': 'var(--shadow-dropdown)',
        'badge': 'var(--shadow-badge)',
      },
      borderRadius: {
        'button': '4px',
        'badge': '2.275px',
        'input': '0',
      },
    },
  },
  plugins: [],
};

export default config;
