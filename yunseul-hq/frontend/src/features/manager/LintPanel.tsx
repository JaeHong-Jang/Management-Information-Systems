import { ListTodo } from 'lucide-react';
import type { LintIssue } from '@shared/contracts';
import type { AsyncState } from '@/shared/lib/useAsync';
import { AsyncView, CiteText, Empty, Panel, Tag } from '@/shared/ui';

const ATTN = new Set<LintIssue['kind']>(['상충', '만료', '표준 불일치', '승인 대기']);
/** 내부 번호(RD001 등)는 화면에 보이지 않게 한다 */
const hideIds = (t: string) => t.replace(/\s*\(?\bRD\d{2,4}\b\)?/g, '');

export function LintPanel({ lint }: { lint: AsyncState<LintIssue[]> }) {
  return (
    <Panel id="lint" title="위키 점검" en="CHECK" sub="위키 관리팀이 찾은 것">
      <AsyncView state={lint}>
        {(issues) =>
          issues.length === 0 ? (
            <Empty title="점검할 것이 없어요" />
          ) : (
            <ul className="space-y-2">
              {issues.map((i, n) => (
                <li key={n} className="flex items-start gap-2 text-body" title={i.ids.join(', ')}>
                  <ListTodo size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
                  <span>
                    <Tag tone={ATTN.has(i.kind) ? 'amber' : 'neutral'}>{i.kind}</Tag> <CiteText text={hideIds(i.detail)} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </AsyncView>
    </Panel>
  );
}
