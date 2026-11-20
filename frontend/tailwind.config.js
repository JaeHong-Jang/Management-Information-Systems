// 디자인 규칙은 docs/DESIGN.md. 무드는 보름달 밤바다(윤슬). 밝은 면이 기본이고 밤 영역만 night.* 를 쓴다. 색 하나에 뜻 하나.
// mark = 점·막대·그래프 노드(흰 배경 3:1 이상), DEFAULT = 글자(연한 배경 위 4.5:1 이상), weak = 연한 배경.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'system-ui', 'sans-serif'] },
      colors: {
        // 회색은 라벤더 기운을 섞은 단계(보름달 사진의 밤 남색 쪽으로 기울임)
        grey: { 50: '#F9F8FC', 100: '#F5F3F8', 200: '#E3E1EE', 300: '#CFCCDD', 400: '#ADA9C0', 500: '#8B849A', 600: '#625B73', 700: '#3E3D5C', 800: '#2A2E50', 900: '#131232' },
        // 남보라: 브랜드·행동·토픽
        brand: { DEFAULT: '#4F5BD5', strong: '#3E47B8', weak: '#EEEFFC', hover: '#E0E2FA' },
        // 밤물결 청록: 검증된 지식(사례 카드, 승인, 해결)
        success: { DEFAULT: '#077A71', mark: '#14948C', weak: '#E4F5F3' },
        // 포차 등불 복숭아빛: 사람 손이 필요한 것(질문, 점장 대기, 주의)
        warning: { DEFAULT: '#B15326', mark: '#E0703F', weak: '#FFF1EA' },
        // 라벤더 보라: 사람
        person: { DEFAULT: '#7436B8', mark: '#9454D4', weak: '#F3ECFD' },
        // 빨강: 막힘·삭제·위험 (데이터 계열로 쓰지 않는다)
        danger: { DEFAULT: '#C9252D', mark: '#F04452', weak: '#FEF0F0', hover: '#FDE2E2' },
        ink: { strong: '#131232', body: '#3E3D5C', weak: '#625B73', disabled: '#8B849A' },
        surface: { DEFAULT: '#FFFFFF', subtle: '#F5F3F8', page: '#F5F3F8' },
        line: '#E3E1EE',
        // 밤 영역(사이드바·대시보드 첫 카드·지식 그래프)에만 쓴다. 나머지 화면은 밝은 면
        night: { deep: '#070D24', base: '#0D1633', side: '#131232', raised: '#1D2445', active: '#23224F', line: '#2A2E50', ink: '#F5F1FC', body: '#D3CBE2', sub: '#B1A4CA', iris: { DEFAULT: '#B8AAFF', soft: '#C4B8FF' }, rim: '#8E8AB7', moon: '#EDE8FF', rose: '#E8B4D0', aqua: '#5FD3C6' },
      },
      borderRadius: { card: '20px' },
      boxShadow: { float: '0 8px 24px rgba(19, 18, 50, 0.14)' },
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
