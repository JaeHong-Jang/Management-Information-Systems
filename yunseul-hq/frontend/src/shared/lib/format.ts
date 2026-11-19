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
