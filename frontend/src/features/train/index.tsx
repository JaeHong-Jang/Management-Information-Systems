import { useEffect, useState } from 'react';
import type { TrainingResult, TrainingTask } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, CardDetail, Empty, PageHeader, Panel, cx, inputCls, useToast } from '@/shared/ui';

export default function Page() {
  const { state, me, refresh } = useLive();
  const toast = useToast();
  const [task, setTask] = useState<TrainingTask | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setResult(null);
    setAnswer('');
    try {
      setTask(await api.trainingTask());
    } catch (e) {
      toast(e instanceof Error ? e.message : '상황을 가져오지 못했어요');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => void load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function grade() {
    if (!task || !answer.trim()) return;
    setBusy(true);
    try {
      setResult(await api.grade(task.id, answer.trim(), me));
      void refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '채점하지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  const tone = result ? (result.score >= 70 ? 'text-success' : result.score >= 40 ? 'text-warning' : 'text-danger') : '';

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      <PageHeader title="먼저 내 판단으로 풀어봐요" desc="AI 없이 먼저 판단해 보면 AI에 기대다 실력이 줄어드는 걸 막을 수 있어요." />

      {!task ? (
        <Empty>{busy ? '상황을 불러오고 있어요' : '상황을 불러오지 못했어요'}</Empty>
      ) : (
        <div className="space-y-4">
          <Panel>
            <Badge tone="brand">{task.topic}</Badge>
            <p className="mt-3 text-[17px] font-semibold leading-7 text-ink-strong">{task.situation}</p>
          </Panel>

          {!result ? (
            <div className="space-y-3">
              <textarea className={cx(inputCls, 'min-h-[120px] resize-none')} placeholder="내가 한다면 이렇게 해요" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <Button size="lg" loading={busy} disabled={!answer.trim()} onClick={() => void grade()}>채점받기</Button>
            </div>
          ) : (
            <>
              <Panel>
                <p className="text-caption text-ink-weak">내 점수</p>
                <p className={cx('mt-1 text-[56px] font-bold leading-none', tone)}>{result.score}<span className="ml-1 text-[20px] text-ink-weak">점</span></p>
                <p className="mt-4 text-[14px] text-ink-strong">{result.feedback}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-success-weak p-3">
                    <p className="mb-1 text-[13px] font-semibold text-success">맞춘 행동</p>
                    {result.good.length ? <ul className="list-disc pl-4 text-[13px] text-ink-strong">{result.good.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p className="text-[13px] text-ink-weak">아직 없어요</p>}
                  </div>
                  <div className="rounded-xl bg-warning-weak p-3">
                    <p className="mb-1 text-[13px] font-semibold text-warning">놓친 행동</p>
                    {result.missing.length ? <ul className="list-disc pl-4 text-[13px] text-ink-strong">{result.missing.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p className="text-[13px] text-ink-weak">놓친 게 없어요</p>}
                  </div>
                </div>
              </Panel>
              <Panel title="위키의 답이에요">
                <CardDetail card={result.card} authorName={state?.people.find((p) => p.id === result.card.authorId)?.name} />
              </Panel>
            </>
          )}

          <Button variant={result ? 'primary' : 'ghost'} size="lg" disabled={busy} onClick={() => void load()}>다른 상황 받기</Button>
        </div>
      )}
    </div>
  );
}
