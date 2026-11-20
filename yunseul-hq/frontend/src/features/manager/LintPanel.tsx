import { ChevronDown, ChevronsRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { LintIssue } from '@shared/contracts';
import { useStoreData } from '@/app/StoreData';
import type { AsyncState } from '@/shared/lib/useAsync';
import { AsyncView, Empty, Panel } from '@/shared/ui';

const labels: Record<LintIssue['kind'], string> = {
  '상충': '지침 상충', '만료': '유효기간 만료', '만료 임박': '만료 예정',
  '중복': '유사 카드', '효과 낮음': '낮은 도움 평가', '공백': '지식 공백',
  '이유 없음': '판단 근거 누락', '승인 대기': '승인 대기', '표준 불일치': '표준 불일치',
};
const actions: Record<LintIssue['kind'], string> = {
  '상충': '관련 카드의 적용 조건 대조 후 매장 지침 통일',
  '만료': '현행 지침과 대조 후 카드 갱신 또는 보관',
  '만료 임박': '만료 전 지침의 유효성 검토',
  '중복': '적용 상황 대조 후 통합 여부 결정',
  '효과 낮음': '현장 평가 확인 후 대응 절차 재검토',
  '공백': '숙련 직원의 사례 수집 및 카드 작성',
  '이유 없음': '대응 절차의 판단 근거 보완',
  '승인 대기': '사례 검토 후 승인 여부 결정',
  '표준 불일치': '매장 운영 방식과 본사 기준 대조 후 조정 여부 검토',
};

export function LintPanel({ lint }: { lint: AsyncState<LintIssue[]> }) {
  const { id } = useParams();
  const { state } = useStoreData();
  return (
    <Panel id="lint" title="위키 점검" bodyClass="p-0" actions={lint.data && <span className="num text-caption text-text-muted">{lint.data.length}건</span>}>
      <AsyncView state={lint}>
        {(issues) => issues.length === 0 ? <Empty title="점검 대상 없음" /> : (
          <ul className="divide-y divide-line">
            {issues.map((issue, index) => {
              const cards = (state.data?.cards ?? []).filter((c) => issue.ids.includes(c.id) || (Boolean(issue.standardId) && c.scope === 'brand' && c.standardId === issue.standardId));
              const openQuestions = issue.kind === '공백' && issue.ids.length > 0;
              return (
                <li key={[issue.kind, ...issue.ids, issue.subject ?? index].join('/')}>
                  <details className="group/audit px-4" open={index === 0}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="mb-0.5 block text-caption font-semibold text-amber-text">{labels[issue.kind]}{issue.kind === '표준 불일치' && <span className="ml-1.5 font-normal text-text-muted">· 가상 표준</span>}</span>
                        <strong className="block text-body text-ink">{issue.subject ?? issue.kind}</strong>
                      </span>
                      <ChevronDown size={16} aria-hidden className="shrink-0 text-text-muted transition-transform group-open/audit:rotate-180" />
                    </summary>
                    <dl className="grid grid-cols-[2.5em_minmax(0,1fr)] gap-x-2 gap-y-2 border-t border-line pb-3 pt-3 text-body">
                      <dt className="text-caption font-bold text-text-muted">근거</dt>
                      <dd>{issue.detail.replace(/\[([BC]\d+)\]/g, '$1')}</dd>
                      <dt className="text-caption font-bold text-text-muted">조치</dt>
                      <dd>{openQuestions ? '미답변 질문 검토 및 답변 등록' : actions[issue.kind]}</dd>
                    </dl>
                    {(cards.length > 0 || openQuestions || issue.kind === '승인 대기') && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {cards.map((card) => <Link key={card.id} to={`/store/${id}/wiki#${card.id}`} title={card.title} className="inline-flex min-h-8 items-center gap-1 rounded-ctl border border-line px-2 text-caption font-semibold hover:bg-ink-weak">카드 {card.id}<ChevronsRight size={12} aria-hidden /></Link>)}
                        {(openQuestions || issue.kind === '승인 대기') && <Link to={`/store/${id}/manager#${openQuestions ? 'questions' : 'pending'}`} className="inline-flex min-h-8 items-center px-1 text-caption font-bold underline">{openQuestions ? '질문 확인' : '승인 목록'}</Link>}
                      </div>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}
