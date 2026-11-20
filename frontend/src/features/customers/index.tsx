// 가상 손님: 한국인 페르소나 손님을 매장에 들여보내 신입 질문 흐름을 실제로 돌리고, 위키의 빈틈을 모은다.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus, Users } from 'lucide-react';
import type { HarnessConfig, Visit } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, Empty, PageHeader, Panel, Stat, cx, fmtTime, useToast } from '@/shared/ui';
import { RunCard } from '../overview';

export default function Customers() {
  const { runs, state } = useLive();
  const toast = useToast();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [harness, setHarness] = useState<HarnessConfig | null>(null);
  useEffect(() => void api.harness().then(setHarness), []);

  const lastRun = runs[0];
  // 실행이 하나 끝날 때마다 방문 기록을 다시 읽는다
  useEffect(() => {
    void api.visits().then((r) => {
      setVisits(r.visits);
      setSimulating(r.simulating);
    });
  }, [lastRun?.runId, lastRun?.done]);

  const send = async (n: number) => {
    try {
      await api.simulate(n);
      setSimulating(true);
      toast(n === 1 ? '손님 한 분이 들어와요' : `손님 ${n}분이 차례로 들어와요`);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const gaps = useMemo(() => visits.filter((v) => v.outcome === 'escalated'), [visits]);
  const answered = visits.length - gaps.length;
  const busy = simulating || !!state?.demoPlaying;

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="시뮬레이션"
        title="가상 손님으로 위키의 빈틈 찾기"
        desc="한국인 페르소나 데이터에서 손님을 뽑아 매장에 들여보내요. 신입이 위키에 묻고, 위키가 모르면 점장에게 넘어가요. 진짜 손님이 오기 전에 빈틈을 먼저 찾아요."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void send(1)} disabled={busy}>
              <UserPlus size={16} /> 손님 1명
            </Button>
            <Button onClick={() => void send(5)} disabled={busy}>
              <Users size={16} /> {simulating ? '손님 응대 중' : '손님 5명'}
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="들어온 손님" value={visits.length} unit="명" />
        <Stat label="위키가 답함" value={answered} unit="명" tone={answered ? 'success' : undefined} />
        <Stat label="점장에게 넘어간 빈틈" value={gaps.length} unit="건" tone={gaps.length ? 'warning' : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          {visits.length === 0 ? (
            <Empty>{busy ? '첫 손님이 들어오고 있어요' : '아직 들어온 손님이 없어요. 오른쪽 위 버튼으로 손님을 들여보내 보세요.'}</Empty>
          ) : (
            visits.map((v) => <VisitCard key={v.questionId} v={v} />)
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {harness && lastRun && lastRun.flowName === harness.flows.ask?.name && (
            <Panel title="지금 에이전트 팀이 하는 일">
              <RunCard run={lastRun} harness={harness} />
            </Panel>
          )}
          <Panel title="숙련 직원에게 받아야 할 노하우">
            {gaps.length === 0 ? (
              <p className="text-[13px] text-ink-weak">위키가 모르는 질문이 생기면 여기에 모여요.</p>
            ) : (
              <ul className="space-y-2">
                {gaps.slice(0, 8).map((v) => (
                  <li key={v.questionId} className="rounded-xl bg-surface-subtle p-3">
                    <Badge tone="neutral">{v.topic}</Badge>
                    <p className="mt-1.5 text-[14px] text-ink-strong">{v.staffQuestion}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/record" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-strong">
              노하우 남기기로 가기 <ArrowRight size={14} />
            </Link>
          </Panel>
          <p className="px-1 text-[12px] leading-5 text-ink-weak">
            손님은 NVIDIA Nemotron-Personas-Korea(CC BY 4.0)의 합성 인물이에요. 통계청 인구 분포를 바탕으로 만든 가상 인물이라 실존 인물이 아니에요. 상황은 {state?.ai.mode === 'ollama' ? '매장 PC의 로컬 AI가 만들고, 결과가 어색하면 정해 둔 상황 틀로 바꿔요' : state?.ai.mode === 'claude' ? 'Claude가 만들어요' : '정해 둔 상황 틀에서 골라요'}.
          </p>
        </div>
      </div>
    </div>
  );
}

function VisitCard({ v }: { v: Visit }) {
  const c = v.customer;
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[15px] font-semibold text-ink-strong">{c.name} 씨</p>
        <p className="text-[13px] text-ink-weak">
          {c.age}세 · {c.sex} · {c.region} · {c.occupation}
        </p>
        <span className="ml-auto text-[12px] text-ink-weak">{fmtTime(v.at)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-weak">{c.persona}</p>

      <div className="mt-3 rounded-xl bg-surface-subtle p-3">
        <p className="text-[13px] text-ink-body">{v.situation}</p>
        <p className="mt-1.5 text-[15px] font-medium text-ink-strong">“{v.customerLine}”</p>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-[12px] font-semibold text-ink-weak">신입 질문</span>
        <p className="text-[14px] text-ink-strong">{v.staffQuestion}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={v.outcome === 'answered' ? 'success' : 'warning'}>{v.outcome === 'answered' ? '위키가 답함' : '점장에게 넘김'}</Badge>
        {v.cited.map((id) => (
          <Badge key={id} tone="brand">{id}</Badge>
        ))}
        <Badge tone="neutral">{v.topic}</Badge>
        <span className={cx('ml-auto text-[12px]', v.via === 'ollama' ? 'text-brand-strong' : 'text-ink-weak')}>
          {v.via === 'ollama' ? '로컬 AI가 만든 상황' : v.via === 'claude' ? 'Claude가 만든 상황' : '상황 틀'}
        </span>
      </div>
    </Panel>
  );
}
