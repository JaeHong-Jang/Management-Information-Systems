// 한국어 검색: 형태소 분석기 없이 조사를 떼고 글자 2-gram BM25. 매장 하나의 사례 수백 개 규모면 충분하다.
import type { Card } from '@shared/contracts';

const STOP = new Set(['어떻게', '해요', '하나요', '되나요', '돼요', '있어요', '없어요', '나와요', '했는데', '하는데', '인데', '근데', '이거', '그거', '매장', '손님', '고객', '지금', '혹시', '어떡해요', '뭐예요', '주세요', '해야', '하죠', '는데요', '들어왔어요']);
// 어미·부사 조각: 어느 카드에나 들어 있어 근거가 되지 못한다(가상 손님 시뮬레이션에서 '다·는데·해요'만으로 엉뚱한 카드가 뽑혔다)
const NOISE = new Set(['다', '좀', '또', '는데', '해요', '어요', '아요', '세요', '에요', '예요', '니다', '습니']);
const JOSA = /(에서|에게|한테|으로|은|는|이|가|을|를|에|도|만|의|와|과|랑|로)$/;

export function tokens(text: string): string[] {
  const words = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => (w.length >= 3 ? w.replace(JOSA, '') : w))
    .filter((w) => w && !STOP.has(w));
  const out: string[] = [];
  for (const w of words) {
    if (w.length === 1) out.push(w);
    for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
  }
  return out.filter((t) => !NOISE.has(t));
}

export const cardText = (c: Card) => [c.title, c.title, c.situation, c.reason, c.actions.join(' '), c.avoid, c.tags.join(' '), c.topic].join(' ');

export interface Hit { card: Card; score: number; coverage: number }

export function search(query: string, cards: Card[], k = 4): Hit[] {
  const q = [...new Set(tokens(query))];
  if (!q.length || !cards.length) return [];
  const docs = cards.map((c) => tokens(cardText(c)));
  const avg = docs.reduce((s, d) => s + d.length, 0) / docs.length;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  return docs
    .map((d, i) => {
      const tf = new Map<string, number>();
      for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      let matched = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        matched++;
        const n = df.get(t)!;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += (idf * f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avg)));
      }
      return { card: cards[i], score, coverage: matched / q.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

const bigramSet = (s: string) => new Set(tokens(s));

export function similarity(a: string, b: string): number {
  const A = bigramSet(a);
  const B = bigramSet(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

/** a의 2-gram 중 b에 들어 있는 비율 (짧은 행동 문장이 긴 답 안에 담겼는지) */
export function containment(a: string, b: string): number {
  const A = bigramSet(a);
  const B = bigramSet(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return A.size ? inter / A.size : 0;
}
