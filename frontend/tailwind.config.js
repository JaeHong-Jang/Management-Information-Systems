// 색은 docs/references/repos.md 채택 팔레트(토스 TDS 구조 참고, 흰 배경 대비 계산값)를 그대로 쓴다.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#3182F6', strong: '#1B64DA', weak: '#E8F3FF' },
        ink: { strong: '#191F28', body: '#4E5968', weak: '#6B7684', disabled: '#8B95A1' },
        surface: { DEFAULT: '#FFFFFF', subtle: '#F2F4F6', page: '#F2F4F6' },
        line: '#E5E8EB',
        danger: { DEFAULT: '#B42318', weak: '#FEF3F2' },
        success: { DEFAULT: '#067647', weak: '#ECFDF3' },
        warning: { DEFAULT: '#B54708', weak: '#FFFAEB' },
        node: { topic: '#3182F6', card: '#0891B2', person: '#6941C6', question: '#B54708', source: '#191F28' },
      },
      borderRadius: { card: '20px' },
      fontSize: {
        title: ['26px', { lineHeight: '34px', fontWeight: '700' }],
        sub: ['19px', { lineHeight: '28px', fontWeight: '700' }],
        body: ['15px', { lineHeight: '24px' }],
        caption: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
