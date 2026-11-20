// LLM 호출 한 곳. 쓸 모델이 없으면(또는 AI_MODE=rules) 호출하지 않고 null을 돌려준다.
// 에이전트는 null이면 자기 규칙으로 같은 모양의 결과를 만든다.
// LLM_PROVIDER=ollama 이면 매장 PC의 로컬 모델(Ollama)을 쓴다. 기록이 매장 밖으로 나가지 않는다.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { AiStatus } from '@shared/contracts';
import { config } from './config.js';

const hasCreds = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const mode: AiStatus['mode'] =
  process.env.AI_MODE === 'rules' ? 'rules' : process.env.LLM_PROVIDER === 'ollama' ? 'ollama' : hasCreds ? 'claude' : 'rules';
const enabled = mode !== 'rules';
const model =
  mode === 'ollama'
    ? process.env[config.llm.ollama.envModel] || config.llm.ollama.model
    : process.env[config.llm.envModel] || config.llm.model;
const ollamaHost = (process.env[config.llm.ollama.envHost] || 'http://localhost:11434').replace(/\/$/, '');
const client = mode === 'claude' ? new Anthropic() : null;

export const status: AiStatus = { mode, model: enabled ? model : null, lastError: null };

async function askOllama<S extends z.ZodType>(system: string, user: string, schema: S): Promise<z.infer<S>> {
  const { $schema: _drop, ...format } = z.toJSONSchema(schema) as Record<string, unknown>;
  const res = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: '30m',
      format,
      options: { temperature: 0.2, num_ctx: 8192, num_predict: 1500 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return schema.parse(JSON.parse(data.message?.content ?? ''));
}

/** 매장 위키 에이전트(수집·답변·관리팀)의 기본 지시. 브랜드·매장 이름을 받아 그 매장 범위로 묶는다 */
export function storeSystem(ctx: { brand: string; store: string }): string {
  return `너는 ${ctx.brand} 가맹점 '${ctx.store}'의 매장 위키를 함께 관리하는 에이전트 팀의 일원이다. 숙련 직원의 현장 노하우와 본사 표준을 신입 아르바이트생이 바로 쓸 수 있게 만든다.
이 매장은 주점이다. 다루는 일: 이용시간, 좌석, 주문·품절, 결제, 신분증, 취객·분쟁, 위생, 응대, 주류.
원칙: 무엇을 했는지보다 왜 그렇게 판단했는지(판단 이유)를 남긴다. 직원이 말하지 않은 사실, 금액, 절차를 지어내지 않는다. 본사 표준과 매장 노하우가 다르면 본사 표준을 따른다. 다른 매장의 카드는 쓰지 않는다. 모르는 칸은 빈 문자열로 둔다. 업무 설명과 판단 근거는 간결한 문어체로 쓴다. 고객에게 직접 전달할 안내문은 자연스러운 존댓말로 쓴다.`;
}

/** 본사 진단·처방 에이전트의 기본 지시 */
export function hqSystem(brand: string): string {
  return `너는 ${brand} 본사의 가맹점 서비스 편차를 진단하고 처방하는 에이전트 팀의 일원이다. 점수·순위·비율은 규칙 코드가 이미 계산했으니 바꾸지 않는다.
너는 분류·설명·초안만 쓴다. 모든 주장에는 주어진 리뷰의 reviewId와 원문 그대로의 인용 문장을 붙인다. 리뷰에 없는 사실을 지어내지 않는다. 본사 표준은 가상 표준이다. 보고 문구는 간결한 문어체로 작성한다. 원문 인용과 고객 응대 발화는 보존하고 이모지를 쓰지 않는다.`;
}

const STORE_SYSTEM = storeSystem({ brand: '역전할머니맥주', store: '가맹점' });

export async function ask<S extends z.ZodType>(
  name: string,
  opts: { system?: string; user: string; schema: S; effort?: 'low' | 'medium' | 'high' },
): Promise<z.infer<S> | null> {
  if (!enabled) return null;
  try {
    if (mode === 'ollama') {
      const out = await askOllama(opts.system ?? STORE_SYSTEM, opts.user, opts.schema);
      status.lastError = null;
      return out;
    }
    const res = await client!.beta.messages.parse({
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
