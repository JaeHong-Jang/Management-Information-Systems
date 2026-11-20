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
      borderRadius: { badge: 'var(--r-badge)', ctl: 'var(--r-ctl)', card: 'var(--r-card)' },
      boxShadow: { pop: '0 12px 32px rgba(35, 24, 21, 0.16)', card: 'var(--shadow-card)' },
      maxWidth: { content: '1280px', staff: '640px' },
      width: { sidebar: '240px', panel: '360px' },
      fontSize: {
        display: ['var(--fs-display)', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.02em' }],
        title: ['var(--fs-title)', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '-0.02em' }],
        section: ['var(--fs-section)', { lineHeight: '1.45', fontWeight: '700', letterSpacing: '-0.015em' }],
        subhead: ['var(--fs-subhead)', { lineHeight: '1.5', fontWeight: '700' }],
        body: ['var(--fs-body)', { lineHeight: '1.6' }],
        caption: ['var(--fs-caption)', { lineHeight: '1.5', fontWeight: '500' }],
        kpi: ['var(--fs-kpi)', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        mobile: ['var(--fs-subhead)', { lineHeight: '1.5' }],
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
