// 팀 구조 보기(금융 TeamStructureView): 지휘 → 일하는 팀들 → 검증 게이트 띠 → 위키 관리팀, 오른쪽 인스펙터.
// 아래 에이전트 목록(AI Platform Dashboard): 단계 번호 · 이름 · 종류 · 하는 일 · 끄면 빠지는 것 · 검증팀 잠금. 끄기는 표시만.
import { useMemo, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { Panel, Tag } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import { declare, flowsOf, type Declared } from './declare';

const WORK = ['monitor', 'diagnose', 'prescribe', 'capture', 'answer'];

function Member({ a, on, onSelect }: { a: Declared; on: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onSelect}
      className={cx('flex min-h-[44px] w-full items-center gap-2 rounded-ctl border px-2.5 py-1.5 text-left', on ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink')}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium">{a.name}</span>
        <span className={cx('block text-[0.6875rem]', on ? 'text-white/75' : 'text-text-muted')}>
          <span className="num">{a.step}</span> · {a.llm ? 'LLM' : '규칙'}
        </span>
      </span>
      {a.locked && <Lock size={12} className="shrink-0" aria-label="끌 수 없음" />}
    </button>
  );
}

export function TeamStructure({ h }: { h: HarnessConfig }) {
  const agents = useMemo(() => declare(h), [h]);
  const [sel, setSel] = useState('orchestrator');
  const selected = agents.find((a) => a.id === sel) ?? agents[0];
  const teamName = new Map(h.teams.map((t) => [t.id, t.name]));
  const of = (team: string) => agents.filter((a) => a.team === team);
  const lead = of('lead');
  const verify = of('verify');
  const keeper = of('keeper');
  const llmCount = agents.filter((a) => a.llm).length;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['에이전트', agents.length],
          ['LLM 에이전트(규칙 대체)', llmCount],
          ['흐름', Object.keys(h.flows).length],
          ['게이트', h.gates.length],
        ].map(([k, v]) => (
          <div key={k} className="relative overflow-hidden rounded-card border border-line bg-surface p-3 shadow-card">
            <dt className="text-caption text-text-muted">{k}</dt>
            <dd className="num text-kpi text-ink">{v}</dd>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-yellow" aria-hidden />
          </div>
        ))}
      </dl>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="팀 구조도" className="min-w-0 space-y-3 rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="mx-auto max-w-xs">
            <p className="mb-1 text-center text-caption font-bold text-text-subtle">{teamName.get('lead')} · 흐름 배정</p>
            {lead.map((a) => <Member key={a.id} a={a} on={sel === a.id} onSelect={() => setSel(a.id)} />)}
          </div>
          <p className="text-center text-caption text-text-muted" aria-hidden>↓ 요청마다 흐름을 골라 아래 팀에 순서대로 넘겨요</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {WORK.map((t) => (
              <section key={t} className="rounded-card bg-surface-sunken p-2.5">
                <h3 className="mb-2 px-1 font-display text-caption">{teamName.get(t)}</h3>
                <div className="space-y-1.5">
                  {of(t).map((a) => <Member key={a.id} a={a} on={sel === a.id} onSelect={() => setSel(a.id)} />)}
                </div>
              </section>
            ))}
          </div>

          {/* 게이트 띠: 검증팀이 모든 흐름의 출구를 지킨다 */}
          <section aria-label="검증 게이트" className="rounded-card border-2 border-ink bg-yellow-weak p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ShieldCheck size={16} aria-hidden />
              <h3 className="font-display text-body">{teamName.get('verify')} · 게이트</h3>
              <span className="inline-flex items-center gap-1 text-caption text-text-subtle"><Lock size={12} aria-hidden />끌 수 없음</span>
              <span className="ml-auto flex flex-wrap gap-1">
                {h.gates.map((g) => <Tag key={g.id} tone="ink"><span className="num">{g.id}</span></Tag>)}
              </span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {verify.map((a) => <Member key={a.id} a={a} on={sel === a.id} onSelect={() => setSel(a.id)} />)}
            </div>
            <p className="mt-2 text-caption text-text-subtle">인용한 리뷰가 실제 그 매장 리뷰인지, 카드 번호가 있는지, 본사 표준과 어긋나지 않는지, 금지 표현이 없는지 봐요. 통과하지 못하면 화면에 나가지 않아요.</p>
          </section>

          <p className="text-center text-caption text-text-muted" aria-hidden>↓ 통과한 결과만 위키와 처방으로</p>
          <section className="mx-auto max-w-2xl rounded-card bg-surface-sunken p-2.5">
            <h3 className="mb-2 px-1 font-display text-caption">{teamName.get('keeper')}</h3>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {keeper.map((a) => <Member key={a.id} a={a} on={sel === a.id} onSelect={() => setSel(a.id)} />)}
            </div>
          </section>
        </section>

        {selected && (
          <aside aria-live="polite" aria-labelledby="inspector-title" className="rounded-card border border-line bg-surface p-4 shadow-card xl:sticky xl:top-[72px] xl:self-start">
            <p className="text-caption text-text-muted">선택한 에이전트 · <span className="num">{selected.step}</span></p>
            <h2 id="inspector-title" className="font-display text-title text-ink">{selected.name}</h2>
            <p className="mt-1 text-body">{selected.role}</p>
            <dl className="mt-3 space-y-2 text-body">
              <div><dt className="text-caption text-text-muted">팀</dt><dd>{selected.teamName}</dd></div>
              <div><dt className="text-caption text-text-muted">종류</dt><dd>{selected.kind}</dd></div>
              <div><dt className="text-caption text-text-muted">끄면 빠지는 것</dt><dd className="flex items-start gap-1">{selected.locked && <Lock size={13} className="mt-1 shrink-0" aria-label="끌 수 없음" />}{selected.off}</dd></div>
              <div>
                <dt className="text-caption text-text-muted">들어가는 흐름</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {flowsOf(h, selected.id).map((f) => <Tag key={f.id}>{f.name} <span className="num">{f.pos}/{f.total}</span></Tag>)}
                  {flowsOf(h, selected.id).length === 0 && <span className="text-text-muted">모든 흐름을 배정해요</span>}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">게이트</dt>
                <dd>{h.gates.filter((g) => g.agents.includes(selected.id)).map((g) => g.id).join(', ') || '없음'}</dd>
              </div>
              <div className="dev"><dt className="text-caption text-text-muted">카드</dt><dd className="num break-all text-caption">harness/{selected.card}</dd></div>
            </dl>
          </aside>
        )}
      </div>

      <Panel title="에이전트 목록" en="ROSTER" sub="끄기 기능은 없어요. 각 에이전트가 빠지면 무엇이 비는지 보여 주는 선언이에요" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-body">
            <thead className="bg-surface-sunken text-left text-caption text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">번호</th>
                <th scope="col" className="px-3 py-2 font-medium">이름</th>
                <th scope="col" className="px-3 py-2 font-medium">팀</th>
                <th scope="col" className="px-3 py-2 font-medium">종류</th>
                <th scope="col" className="px-3 py-2 font-medium">하는 일</th>
                <th scope="col" className="px-3 py-2 font-medium">끄면 빠지는 것</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className={cx('border-t border-line align-top', sel === a.id && 'bg-ink-weak')}>
                  <td className="num px-3 py-2 text-text-muted">{a.step}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setSel(a.id)} className="font-bold text-ink hover:underline">{a.name}</button>
                    <div className="num dev text-[0.6875rem] text-text-muted">{a.id}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{a.teamName}</td>
                  <td className="whitespace-nowrap px-3 py-2"><Tag>{a.kind}</Tag></td>
                  <td className="px-3 py-2 text-text-subtle">{a.role}</td>
                  <td className="px-3 py-2">
                    {a.locked ? (
                      <span className="inline-flex items-start gap-1 font-medium"><Lock size={13} className="mt-1 shrink-0" aria-label="잠금" />{a.off}</span>
                    ) : (
                      <span className="text-text-subtle">{a.off}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
