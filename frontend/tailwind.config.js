// 디자인 규칙은 docs/DESIGN.md. 회색·파랑은 토스 TDS 단계를 따르고, 나머지 색은 뜻 하나씩만 맡는다.
// mark = 점·막대·그래프 노드(흰 배경 3:1 이상), DEFAULT = 글자(연한 배경 위 4.5:1 이상), weak = 연한 배경.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'system-ui', 'sans-serif'] },
      colors: {
        grey: { 50: '#F9FAFB', 100: '#F2F4F6', 200: '#E5E8EB', 300: '#D1D6DB', 400: '#B0B8C1', 500: '#8B95A1', 600: '#6B7684', 700: '#4E5968', 800: '#333D4B', 900: '#191F28' },
        // 파랑: 브랜드·행동·토픽
        brand: { DEFAULT: '#3182F6', strong: '#1B64DA', weak: '#E8F3FF', hover: '#D6E8FF' },
        // 초록: 검증된 지식(사례 카드, 승인, 해결)
        success: { DEFAULT: '#0B7A5A', mark: '#139E76', weak: '#E7F7F1' },
        // 주황: 사람 손이 필요한 것(질문, 점장 대기, 주의)
        warning: { DEFAULT: '#B5420F', mark: '#EB6834', weak: '#FFF1EA' },
        // 보라: 사람
        person: { DEFAULT: '#8E2F8B', mark: '#B44CB0', weak: '#F9EDF8' },
        // 빨강: 막힘·삭제·위험 (데이터 계열로 쓰지 않는다)
        danger: { DEFAULT: '#C9252D', mark: '#F04452', weak: '#FEF0F0', hover: '#FDE2E2' },
        ink: { strong: '#191F28', body: '#4E5968', weak: '#6B7684', disabled: '#8B95A1' },
        surface: { DEFAULT: '#FFFFFF', subtle: '#F2F4F6', page: '#F2F4F6' },
        line: '#E5E8EB',
      },
      borderRadius: { card: '20px' },
      boxShadow: { float: '0 8px 24px rgba(25, 31, 40, 0.10)' },
      fontSize: {
        title: ['26px', { lineHeight: '34px', fontWeight: '700', letterSpacing: '-0.01em' }],
        sub: ['19px', { lineHeight: '28px', fontWeight: '700' }],
        body: ['15px', { lineHeight: '24px' }],
        caption: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
