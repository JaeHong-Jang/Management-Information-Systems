// 색과 글꼴은 src/index.css의 포털 변수를 공유한다.
// 빨강은 고위험, 노랑은 주의, ink는 일반 조작에 쓴다.
// 글자 크기는 rem: 심사 모드(html.present)에서 루트 크기만 바꿔 전체를 키운다.
/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--portal-font)'],
        display: ['var(--portal-display)'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), sunken: v('surface-sunken') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        text: { DEFAULT: v('text'), subtle: v('text-subtle'), muted: v('text-muted') },
        ink: { DEFAULT: v('ink'), hover: v('ink-hover'), weak: v('ink-weak') },
        low: { bar: v('low-bar') },
        amber: { text: v('amber-text'), bar: v('brand-yellow'), weak: v('yellow-weak') },
        yellow: { DEFAULT: v('brand-yellow'), hl: v('brand-highlight'), weak: v('yellow-weak') },
        red: { DEFAULT: v('brand-red'), text: v('brand-red'), bar: v('brand-red') },
        maroon: v('brand-maroon'),
        done: { DEFAULT: v('done'), weak: v('done-weak') },
        know: { DEFAULT: v('cause-know'), weak: v('cause-know-weak') },
        ops: { DEFAULT: v('cause-ops'), weak: v('cause-ops-weak') },
        rule: { DEFAULT: v('cause-rule'), weak: v('cause-rule-weak') },
        hyg: { DEFAULT: v('cause-hyg'), weak: v('cause-hyg-weak') },
      },
      borderRadius: { badge: '4px', ctl: '6px', card: '6px' },
      boxShadow: { pop: '0 12px 32px rgba(35, 24, 21, 0.16)', card: '0 1px 2px rgba(35, 24, 21, 0.035)' },
      maxWidth: { content: '1280px', staff: '640px' },
      width: { sidebar: '240px', panel: '360px' },
      fontSize: {
        display: ['clamp(1.65rem, 2.25vw, 2rem)', { lineHeight: '1.25', fontWeight: '700' }],
        title: ['1.375rem', { lineHeight: '1.875rem', fontWeight: '700' }],
        section: ['1.125rem', { lineHeight: '1.5', fontWeight: '700' }],
        body: ['0.875rem', { lineHeight: '1.5rem' }],
        subhead: ['1rem', { lineHeight: '1.5', fontWeight: '650' }],
        caption: ['0.75rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        kpi: ['1.75rem', { lineHeight: '2.125rem', fontWeight: '700' }],
        mobile: ['1rem', { lineHeight: '1.5rem' }],
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        flow: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '24px 0' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        flow: 'flow .8s linear infinite',
        rise: 'rise .35s ease-out both',
      },
    },
  },
  plugins: [],
};
