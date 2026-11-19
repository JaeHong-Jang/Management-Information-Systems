// 숫자·날짜 표시. 값이 없으면 '미확인'이나 '—'로 쓴다(0으로 바꾸지 않는다).
export const pct = (v: number | null | undefined, digits = 0) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`);
export const rating = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(2));
export const star = (v: number | null | undefined) => (v == null ? '별점 없음' : `${Number.isInteger(v) ? v : v.toFixed(1)}점`);
export const int = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('ko-KR'));

export function date(iso: string | null | undefined) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function time(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

/** a가 b보다 몇 분 뒤인지. 둘 다 서버 형식(타임존 없는 ISO)이라 같은 기준으로 읽는다. 읽지 못하면 null */
export function minutesBetween(later: string | null | undefined, earlier: string | null | undefined): number | null {
  if (!later || !earlier) return null;
  const a = new Date(later).getTime();
  const b = new Date(earlier).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((a - b) / 60000));
}

export function agoLabel(min: number | null) {
  if (min == null) return '';
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / (60 * 24))}일 전`;
}
