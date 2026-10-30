import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentDef, HarnessConfig } from '@shared/contracts';
import { HARNESS_DIR } from '../paths.js';

export const config = JSON.parse(readFileSync(join(HARNESS_DIR, 'harness.config.json'), 'utf8')) as HarnessConfig;

const byId = new Map(config.agents.map((a) => [a.id, a]));

export function agentDef(id: string): AgentDef {
  const a = byId.get(id);
  if (!a) throw new Error(`harness.config.json에 없는 에이전트: ${id}`);
  return a;
}
