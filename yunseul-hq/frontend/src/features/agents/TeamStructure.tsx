import { useMemo, useState } from 'react';
import { ChevronRight, Lock, Search } from 'lucide-react';
import type { HarnessConfig } from '@shared/contracts';
import { Panel } from '@/shared/ui';
import { declare } from './declare';
import { StepDrawer } from './StepDrawer';

export function TeamStructure({ h }: { h: HarnessConfig }) {
  const agents = useMemo(() => declare(h), [h]);
  const [team, setTeam] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const agent = agents.find((a) => a.id === selected);
  const search = query.trim().toLowerCase();
  const rows = agents.filter((a) => (!team || team === a.team) && [a.name, a.id, a.teamName, a.role].some((val) => val.toLowerCase().includes(search)));
  return (
    <div className="ops-workspace">
      <dl className="ops-reg-stats">
        <div><dt>담당 조직</dt><dd>{h.teams.length}<small>개 팀</small></dd></div>
        <div><dt>에이전트</dt><dd>{agents.length}<small>개</small></dd></div>
        <div><dt>업무 흐름</dt><dd>{Object.keys(h.flows).length}<small>종</small></dd></div>
        <div><dt>검증 기준</dt><dd>{h.gates.length}<small>종</small></dd></div>
      </dl>
      <Panel title="에이전트 명부" bodyClass="p-0" actions={<span className="text-caption text-text-muted" role="status">{rows.length} / {agents.length}개</span>}>
        <div className="ops-filters">
          <label>팀<select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">전체 팀</option>{h.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
          <label className="ops-search"><Search size={15} aria-hidden /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 또는 업무 검색" aria-label="이름 또는 업무 검색" /></label>
        </div>
        {rows.length ? (
          <ul className="ops-registry">
            {rows.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setSelected(a.id)} aria-label={`${a.name} 업무 명세`}>
                  <span className="ops-reg-team">{a.teamName}</span>
                  <strong>{a.name}</strong>
                  <span className="ops-reg-role">{a.role}</span>
                  <small>{a.locked && <Lock size={12} aria-label="필수 단계" />}{a.llm ? 'LLM·규칙' : '규칙'}</small>
                  <ChevronRight className="ops-chevron" size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="ops-empty">검색 조건에 해당하는 에이전트가 없습니다.</p>}
      </Panel>
      <p className="ops-identifier dev">{h.name} {h.version} · 구성 모델 {h.llm.model} · LLM 지원 {agents.filter((a) => a.llm).length}개</p>
      {agent && <StepDrawer h={h} a={agent} live="wait" run={null} onClose={() => setSelected(null)} />}
    </div>
  );
}
