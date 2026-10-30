// LLM 호출 한 곳. 키가 없으면(또는 AI_MODE=rules) 호출하지 않고 null을 돌려준다.
// 에이전트는 null이면 자기 규칙으로 같은 모양의 결과를 만든다.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import type { AiStatus } from '@shared/contracts';
import { config } from './config.js';

const model = process.env[config.llm.envModel] || config.llm.model;
const hasCreds = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const enabled = process.env.AI_MODE !== 'rules' && hasCreds;
const client = enabled ? new Anthropic() : null;

export const status: AiStatus = { mode: enabled ? 'claude' : 'rules', model: enabled ? model : null, lastError: null };

export const STORE_SYSTEM = `너는 한 매장의 '매장 위키'를 함께 관리하는 에이전트 팀의 일원이다. 숙련 직원의 현장 노하우를 신입 아르바이트생이 바로 쓸 수 있게 만든다.
원칙: 무엇을 했는지보다 왜 그렇게 판단했는지(판단 이유)를 남긴다. 직원이 말하지 않은 사실, 금액, 절차를 지어내지 않는다. 모르는 칸은 빈 문자열로 둔다. 짧은 매뉴얼체로 쓴다.`;

export async function ask<S extends z.ZodType>(
  name: string,
  opts: { system?: string; user: string; schema: S; effort?: 'low' | 'medium' | 'high' },
): Promise<z.infer<S> | null> {
  if (!client) return null;
  try {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: opts.effort ?? 'low', format: betaZodOutputFormat(opts.schema) },
      system: opts.system ?? STORE_SYSTEM,
      messages: [{ role: 'user', content: opts.user }],
    });
    if (res.stop_reason === 'refusal') throw new Error(`refusal (${res.stop_details?.category ?? 'unknown'})`);
    if (!res.parsed_output) throw new Error(`구조화 출력 없음 (stop_reason=${res.stop_reason})`);
    status.lastError = null;
    return res.parsed_output as z.infer<S>;
  } catch (err) {
    status.lastError = `${name}: ${err instanceof Anthropic.APIError ? `API ${err.status} ${err.message}` : (err as Error).message}`;
    console.error('[llm]', status.lastError);
    return null;
  }
}

export const llmEnabled = () => enabled;
