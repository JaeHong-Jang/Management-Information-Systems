// 위키 점검: 유형 요약(건수) → 유형별 묶음(조치 기준 한 줄) → 항목(대상·근거·관련 카드).
// 같은 유형의 조치는 같으므로 묶음 머리에 한 번만 적는다.
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { LintIssue } from '@shared/contracts';
import { useStoreData } from '@/app/StoreData';
import type { AsyncState } from '@/shared/lib/useAsync';
import { AsyncView, Empty, Panel } from '@/shared/ui';

type Kind = LintIssue['kind'];

// 표시 순서 = 처리 우선순위
const KINDS: { kind: Kind; label: string; action: string }[] = [
  { kind: '상충', label: '지침 상충', action: '관련 카드의 적용 조건 대조 후 매장 지침 통일' },
  { kind: '표준 불일치', label: '표준 불일치', action: '매장 운영 방식과 본사 기준 대조 후 조정 여부 검토' },
  { kind: '만료', label: '유효기간 만료', action: '현행 지침과 대조 후 카드 갱신 또는 보관' },
  { kind: '승인 대기', label: '승인 대기', action: '사례 검토 후 승인 여부 결정' },
  { kind: '공백', label: '지식 공백', action: '숙련 직원의 사례 수집 및 카드 작성' },
  { kind: '만료 임박', label: '만료 예정', action: '만료 전 지침의 유효성 검토' },
  { kind: '효과 낮음', label: '낮은 도움 평가', action: '현장 평가 확인 후 대응 절차 재검토' },
  { kind: '이유 없음', label: '판단 근거 누락', action: '대응 절차의 판단 근거 보완' },
  { kind: '중복', label: '유사 카드', action: '적용 상황 대조 후 통합 여부 결정' },
];

export function LintPanel({ lint }: { lint: AsyncState<LintIssue[]> }) {
  const { id } = useParams();
  const { state } = useStoreData();
  const [only, setOnly] = useState<Kind | null>(null);
  return (
    <Panel id="lint" title="위키 점검" sub="카드 간 충돌·기준 차이·유효기간 점검 결과" bodyClass="!p-0">
      <AsyncView state={lint}>
        {(issues) => {
          if (issues.length === 0) return <div className="p-4"><Empty title="점검 대상 없음" /></div>;
          const groups = KINDS.map((k) => ({ ...k, items: issues.filter((i) => i.kind === k.kind) })).filter((g) => g.items.length > 0);
          const shown = groups.filter((g) => !only || g.kind === only);
          return (
            <>
              <div className="lint-summary" role="group" aria-label="점검 유형">
                <button type="button" aria-pressed={only === null} onClick={() => setOnly(null)}>전체<b className="num">{issues.length}</b></button>
                {groups.map((g) => (
                  <button key={g.kind} type="button" aria-pressed={only === g.kind} onClick={() => setOnly(only === g.kind ? null : g.kind)}>
                    {g.label}<b className="num">{g.items.length}</b>
                  </button>
                ))}
              </div>
              {shown.map((g) => (
                <section key={g.kind} className="lint-group" aria-label={g.label}>
                  <header>
                    <h3>{g.label}<span className="num">{g.items.length}건</span>{g.kind === '표준 불일치' && <em>가상 표준 기준</em>}</h3>
                    <p><span>조치</span>{g.action}</p>
                  </header>
                  <ol>
                    {g.items.map((issue, index) => {
                      const cards = (state.data?.cards ?? []).filter((c) => issue.ids.includes(c.id) || (Boolean(issue.standardId) && c.scope === 'brand' && c.standardId === issue.standardId));
                      const openQuestions = issue.kind === '공백' && issue.ids.length > 0;
                      const queue = openQuestions ? 'questions' : issue.kind === '승인 대기' ? 'pending' : null;
                      return (
                        <li key={[issue.kind, ...issue.ids, issue.subject ?? index].join('/')}>
                          <span className="lint-index num" aria-hidden>{index + 1}</span>
                          <div className="min-w-0">
                            <strong>{issue.subject ?? issue.kind}</strong>
                            <dl>
                              <dt>근거</dt>
                              <dd>{issue.detail.replace(/\[([BC]\d+)\]/g, '$1')}</dd>
                              {openQuestions && <><dt>조치</dt><dd>미답변 질문 검토 및 답변 등록</dd></>}
                              {(cards.length > 0 || queue) && (
                                <>
                                  <dt>관련</dt>
                                  <dd className="lint-refs">
                                    {cards.map((card) => <Link key={card.id} to={`/store/${id}/wiki#${card.id}`} title={card.title}>카드 {card.id}<ChevronRight size={12} aria-hidden /></Link>)}
                                    {queue && <Link to={`/store/${id}/manager#${queue}`}>{openQuestions ? '질문 목록' : '승인 목록'}<ChevronRight size={12} aria-hidden /></Link>}
                                  </dd>
                                </>
                              )}
                            </dl>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </>
          );
        }}
      </AsyncView>
    </Panel>
  );
}
