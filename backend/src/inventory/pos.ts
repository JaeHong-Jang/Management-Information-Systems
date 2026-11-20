// POS 매출 CSV 읽기. POS마다 열 이름과 인코딩이 달라서 흔한 변형을 받는다.
import type { Sale } from '@shared/contracts';

const DATE_COLS = ['일자', '판매일자', '영업일자', '매출일자', '날짜', '판매일', 'date'];
const MENU_COLS = ['메뉴명', '상품명', '품목명', '메뉴', '상품', '품목', 'menu', 'item'];
const QTY_COLS = ['수량', '판매수량', '판매 수량', '개수', 'qty', 'quantity'];
const TOTAL_ROWS = new Set(['합계', '소계', '총계', '총합계']);

/** UTF-8로 읽고, 깨지면 EUC-KR(국내 POS 엑셀 내보내기 기본값)로 읽는다 */
export function decode(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('euc-kr').decode(bytes);
  }
  return text.replace(/^\uFEFF/, '');
}

/** 따옴표 안의 쉼표("1,200")를 지키며 한 줄을 나눈다 */
function splitRow(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
const findCol = (header: string[], names: string[]) => header.findIndex((h) => names.some((n) => norm(h) === norm(n)));

/** 2026-10-30, 2026.10.30, 2026/10/30, 20261030, 2026-10-30 23:10 → 2026-10-30 */
export function normDate(raw: string): string | null {
  const m = raw.match(/(\d{4})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const normMenu = (s: string) => s.replace(/\s+/g, ' ').trim();

export interface ParsedPos { sales: Sale[]; rows: number; skipped: number; days: string[] }

/** 머리말 줄(제목·기간)을 건너뛰고 날짜·메뉴·수량 열이 모두 있는 줄을 머리글로 삼는다. 날짜가 빈 줄은 위 날짜를 이어 쓴다. */
export function parsePosCsv(text: string): ParsedPos {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines.slice(0, 10).some((l) => l.includes('\t')) ? '\t' : ',';
  const rows = lines.map((l) => splitRow(l, sep));
  const h = rows.findIndex((r) => findCol(r, DATE_COLS) >= 0 && findCol(r, MENU_COLS) >= 0 && findCol(r, QTY_COLS) >= 0);
  if (h < 0) throw Object.assign(new Error(`날짜·메뉴·수량 열을 찾지 못했어요. 열 이름 예: ${DATE_COLS[1]}, ${MENU_COLS[0]}, ${QTY_COLS[0]}`), { status: 400 });
  const [di, mi, qi] = [findCol(rows[h], DATE_COLS), findCol(rows[h], MENU_COLS), findCol(rows[h], QTY_COLS)];

  const sums = new Map<string, Sale>();
  let lastDate: string | null = null;
  let skipped = 0;
  let count = 0;
  for (const r of rows.slice(h + 1)) {
    const date: string | null = r[di] ? normDate(r[di]) : lastDate;
    const menu = normMenu(r[mi] ?? '');
    const qty = Number((r[qi] ?? '').replace(/[,\s]/g, ''));
    if (TOTAL_ROWS.has(menu.replace(/\s/g, ''))) continue;
    if (!date || !menu || !Number.isFinite(qty) || (r[qi] ?? '').trim() === '') {
      skipped++;
      continue;
    }
    lastDate = date;
    count++;
    const key = `${date}|${menu}`;
    const s = sums.get(key) ?? { date, menu, qty: 0 };
    s.qty += qty; // 취소·반품(음수)은 빼진다
    sums.set(key, s);
  }
  const sales = [...sums.values()].filter((s) => s.qty !== 0).sort((a, b) => a.date.localeCompare(b.date) || a.menu.localeCompare(b.menu, 'ko'));
  return { sales, rows: count, skipped, days: [...new Set(sales.map((s) => s.date))] };
}
