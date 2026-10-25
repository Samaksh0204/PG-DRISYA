/** @type {import('tailwindcss').Config} */
// All colours come from CSS variables defined in src/index.css (the design tokens),
// so the palette can be adjusted in one place. Values are "R G B" triplets so
// Tailwind's opacity modifiers (bg-brand-500/20) keep working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix, steps) => Object.fromEntries(steps.map((s) => [s, token(`${prefix}-${s}`)]));
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Teal — primary actions, links, active states
        brand: scale('brand', STEPS),
        teal: scale('brand', STEPS),
        // Deep navy → slate neutrals: headings, body text, borders, backgrounds
        ink: scale('ink', STEPS),
        navy: token('ink-900'),
        page: token('page'),
        surface: token('surface'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 42 67 / 0.04), 0 2px 8px rgb(16 42 67 / 0.05)',
        'card-hover': '0 6px 12px rgb(16 42 67 / 0.06), 0 16px 32px rgb(16 42 67 / 0.10)',
        soft: '0 1px 3px rgb(16 42 67 / 0.06)',
        focus: '0 0 0 3px rgb(20 184 166 / 0.25)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'backdrop-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'backdrop-in': 'backdrop-in 0.2s ease-out both',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
