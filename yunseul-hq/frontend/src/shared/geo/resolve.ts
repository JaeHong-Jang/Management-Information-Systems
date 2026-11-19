// 매장의 (시도, 시군구) → 시군구 경계(TTA RegionMap의 koreaShapes 방식을 줄여 옮김).
// 경계는 통계청 2018 행정구역(koreaGeo.ts). 시군구 이름은 전국에서 유일하지 않으므로 늘 (시도, 이름) 쌍으로 찾는다.
// 못 찾으면 null — 지리를 지어내지 않는다. 화면은 못 찾은 매장 수를 따로 밝힌다.
import { MUNICIPALITIES, PROVINCES, type GeoShape } from './koreaGeo';

export { GEO_VIEW, MUNICIPALITIES, PROVINCES } from './koreaGeo';
export type { GeoShape };

/** 시도 표기 접두어 → 통계청 경계 코드. 2026 통합 표기(전남광주통합특별시)는 두 시도를 함께 찾는다 */
const PROVINCE_ALIASES: [string[], string[]][] = [
  [['서울'], ['11']],
  [['부산'], ['21']],
  [['대구'], ['22']],
  [['인천'], ['23']],
  [['전남광주'], ['24', '36']],
  [['광주광역', '광주'], ['24']],
  [['대전'], ['25']],
  [['울산'], ['26']],
  [['세종'], ['29']],
  [['경기'], ['31']],
  [['강원'], ['32']],
  [['충청북', '충북'], ['33']],
  [['충청남', '충남'], ['34']],
  [['전라북', '전북'], ['35']],
  [['전라남', '전남'], ['36']],
  [['경상북', '경북'], ['37']],
  [['경상남', '경남'], ['38']],
  [['제주'], ['39']],
];

/** 2018 경계 이후 바뀐 이름 → 그 자리의 옛 경계 이름(시도 코드:이름). 옛 경계로 칠한다는 뜻이다 */
const LEGACY: Record<string, string> = {
  '23:미추홀구': '남구',
  '23:서해구': '서구',
  '23:검단구': '서구',
  '23:영종구': '중구',
  '23:제물포구': '중구',
};

export function provinceCodes(region: string): string[] {
  const t = region.trim();
  return PROVINCE_ALIASES.find(([aliases]) => aliases.some((a) => t.startsWith(a)))?.[1] ?? [];
}

const BY_PROVINCE = new Map<string, GeoShape[]>();
for (const m of MUNICIPALITIES) {
  const list = BY_PROVINCE.get(m.province!) ?? [];
  list.push(m);
  BY_PROVINCE.set(m.province!, list);
}
export const PROVINCE_BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

/** 정확히 맞는 이름, 없으면 그 이름으로 시작하는 조각(구가 나뉜 시)을 합친다 */
function find(code: string, name: string): GeoShape | null {
  const list = BY_PROVINCE.get(code);
  if (!list || !name) return null;
  const exact = list.find((m) => m.name === name);
  if (exact) return exact;
  const parts = list.filter((m) => m.name.startsWith(name));
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return {
    code: parts.map((m) => m.code).join('+'),
    name,
    province: code,
    d: parts.map((m) => m.d).join(''),
    cx: Math.round(parts.reduce((a, m) => a + m.cx, 0) / parts.length),
    cy: Math.round(parts.reduce((a, m) => a + m.cy, 0) / parts.length),
  };
}

/** '수원시 팔달구' → '수원시팔달구' → '수원시' → '팔달구' 순으로, 구체적인 것부터 찾는다 */
export function findDistrict(region: string, district: string): GeoShape | null {
  const tokens = district.trim().split(/\s+/).filter((t) => /[시군구]$/.test(t));
  for (const code of provinceCodes(region)) {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = tokens.length; j > i; j--) {
        const name = tokens.slice(i, j).join('');
        const shape = find(code, LEGACY[`${code}:${name}`] ?? name);
        if (shape) return shape;
      }
    }
  }
  return null;
}
