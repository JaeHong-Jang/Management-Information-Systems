import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HARNESS_DIR } from '../paths.js';

interface Rule { id: string; pattern: string; why: string }
interface Pii { id: string; pattern: string; mask: string }

const policy = JSON.parse(readFileSync(join(HARNESS_DIR, 'policies', 'forbidden-phrases.json'), 'utf8')) as { rules: Rule[]; pii: Pii[] };

export function forbidden(text: string): { id: string; why: string; match: string }[] {
  return policy.rules.flatMap((r) => {
    const m = text.match(new RegExp(r.pattern));
    return m ? [{ id: r.id, why: r.why, match: m[0] }] : [];
  });
}

export function maskPii(text: string): { text: string; masked: number } {
  let masked = 0;
  let out = text;
  for (const p of policy.pii) {
    out = out.replace(new RegExp(p.pattern, 'g'), () => {
      masked++;
      return p.mask;
    });
  }
  return { text: out, masked };
}
