import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Mic, Square } from 'lucide-react';
import type { InterviewDraft, Source } from '@shared/contracts';
import { api, type DraftFields, type FollowupAnswer } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, Empty, Field, PageHeader, Panel, cx, inputCls, useToast } from '@/shared/ui';

type Step = 1 | 2 | 3 | 4;
const STEPS = ['있었던 일', 'AI가 되묻기', '카드 확인'];
const AGENT_NAMES: Record<string, string> = {
  'privacy-guard': '개인정보 가드',
  interviewer: '인터뷰어',
  'card-writer': '카드 작성',
  'wording-guard': '표현 검증',
};

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => RecognitionLike;
const getRecognition = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const DRAFT_KEY = 'record-draft';
interface Saved { step: Step; raw: string; draft: InterviewDraft | null; answers: string[]; actionsText: string; credit: boolean }
const loadSaved = (): Partial<Saved> => {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Saved>;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const cur = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', done || cur ? 'bg-brand text-white' : 'bg-surface-subtle text-ink-weak')}>
              {done ? <Check size={14} /> : n}
            </span>
            <span className={cx('truncate text-[13px] font-semibold', cur ? 'text-ink-strong' : 'text-ink-weak')}>{label}</span>
            {n < 3 && <span className={cx('h-px flex-1', done ? 'bg-brand' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function Page() {
  const { state, runs, me, refresh } = useLive();
  const toast = useToast();
  const saved = useMemo(loadSaved, []);
  const [step, setStep] = useState<Step>(saved.draft && saved.step && saved.step >= 2 && saved.step <= 3 ? saved.step : 1);
  const [raw, setRaw] = useState(saved.raw ?? '');
  const [draft, setDraft] = useState<InterviewDraft | null>(saved.draft ?? null);
  const [answers, setAnswers] = useState<string[]>(saved.answers ?? []);
  const [credit, setCredit] = useState(saved.credit ?? true);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<string>('');
  const [actionsText, setActionsText] = useState(saved.actionsText ?? '');
  const [result, setResult] = useState<'approved' | 'pending' | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const Rec = useMemo(() => getRecognition(), []);

  const person = state?.people.find((p) => p.id === me);
  const run = useMemo(() => (startedAt ? runs.find((r) => r.flowName === '노하우 기록' && r.at >= startedAt) : undefined), [runs, startedAt]);

  useEffect(() => () => recRef.current?.stop(), []);

  const hasSaved = step < 4 && (raw.trim() !== '' || draft !== null);
  useEffect(() => {
    if (!hasSaved) return;
    const v: Saved = { step, raw, draft, answers, actionsText, credit };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
  }, [hasSaved, step, raw, draft, answers, actionsText, credit]);

  const toggleVoice = () => {
    if (!Rec) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const r = new Rec();
    r.lang = 'ko-KR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setRaw((v) => (v ? v + ' ' : '') + text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  };

  const applyDraft = (d: InterviewDraft) => {
    setDraft(d);
    setActionsText(d.actions.join('\n'));
  };

  const start = async () => {
    recRef.current?.stop();
    setBusy(true);
    setStartedAt(new Date().toISOString());
    try {
      const d = await api.interview(raw.trim(), me);
      applyDraft(d);
      if (d.followups.length > 0) {
        setAnswers(d.followups.map(() => ''));
        setStep(2);
      } else setStep(3);
    } catch (e) {
      toast(e instanceof Error ? e.message : '정리하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const answer = async () => {
    if (!draft) return;
    setBusy(true);
    setStartedAt(new Date().toISOString());
    const list: FollowupAnswer[] = draft.followups.map((q, i) => ({ question: q, answer: answers[i] ?? '' })).filter((a) => a.answer.trim());
    try {
      applyDraft(await api.interview(raw.trim(), me, list));
      setStep(3);
    } catch (e) {
      toast(e instanceof Error ? e.message : '카드를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const { followups: _f, masked: _m, problems: _p, ...fields } = draft;
      const actions = actionsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const payload: DraftFields & { credit: boolean } = { ...fields, actions, credit };
      const card = await api.submitCard(payload, me);
      localStorage.removeItem(DRAFT_KEY);
      setResult(card.status === 'approved' ? 'approved' : 'pending');
      setStep(4);
      void refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : '올리지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRaw('');
    setDraft(null);
    setAnswers([]);
    setActionsText('');
    setResult(null);
    setStartedAt('');
    setCredit(true);
  };

  const set = <K extends keyof InterviewDraft>(k: K, v: InterviewDraft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const progress = (busy || run) && step <= 3 && (
    <Panel title="AI가 일하는 중이에요" className="mt-4 bg-surface-subtle">
      {run ? (
        <ul className="space-y-2">
          {run.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px]">
              <Check size={16} className="mt-0.5 shrink-0 text-success" />
              <span>
                <b className="text-ink-strong">{AGENT_NAMES[s.agentId] ?? s.agentId}</b> <span className="text-ink-body">{s.summary}</span>
              </span>
            </li>
          ))}
          {run.running && (
            <li className="flex items-center gap-2 text-[14px] text-ink-weak">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              {AGENT_NAMES[run.running] ?? run.running}
            </li>
          )}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-weak">곧 시작해요</p>
      )}
      {draft && draft.masked > 0 && <p className="mt-3 text-[13px] font-semibold text-brand-strong">개인정보 {draft.masked}곳을 가렸어요</p>}
    </Panel>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="노하우 남기기" title={step === 4 ? '남겨 주셔서 고마워요' : '노하우 남기기'} />
      {step < 4 && <Stepper step={step} />}

      {step === 1 && (
        <>
          <h2 className="mb-3 text-sub text-ink-strong">방금 있었던 일을 남겨 주세요</h2>
          <p className="mb-3 text-[14px] text-ink-body">짧게 남겨 두면 돼요. 정리와 확인은 나중에 해도 돼요.</p>
          <textarea
            className={cx(inputCls, 'min-h-40')}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="예: 오늘 아침에 냉장고 온도가 9도까지 올라가 있었어요. 우유랑 생크림을 확인하고 문 앞쪽 것만 버렸어요. 점장님께 바로 알렸고요."
          />
          {raw.trim() !== '' && <p className="mt-2 text-[12px] text-ink-weak">임시 저장됨</p>}
          <div className="mt-3 flex gap-2">
            {Rec && (
              <Button variant="ghost" onClick={toggleVoice} type="button">
                {listening ? <Square size={16} /> : <Mic size={16} />}
                {listening ? '그만 말하기' : '말로 남기기'}
              </Button>
            )}
            <Button className="flex-1" disabled={raw.trim().length < 5} loading={busy} onClick={() => void start()}>
              AI에게 정리 맡기기
            </Button>
          </div>
          {progress}
        </>
      )}

      {step === 2 && draft && (
        <>
          <h2 className="mb-3 text-sub text-ink-strong">조금만 더 알려 주세요</h2>
          {draft.masked > 0 && <p className="mb-3 text-[13px] font-semibold text-brand-strong">개인정보 {draft.masked}곳을 가렸어요</p>}
          <div className="space-y-3">
            {draft.followups.map((q, i) => (
              <Panel key={i} title={<span className="text-[13px] text-brand-strong">AI가 궁금한 점</span>}>
                <p className="mb-3 text-[16px] font-semibold text-ink-strong">{q}</p>
                <textarea className={cx(inputCls, 'min-h-20')} value={answers[i] ?? ''} placeholder="아는 만큼만 적어 주세요" onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                <p className="mt-2 text-[12px] text-ink-weak">실제로 확인한 조건이나 겪은 일을 적어 주세요. 모르면 비워 둬도 돼요.</p>
              </Panel>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button className="flex-1" loading={busy} onClick={() => void answer()}>
              답하고 카드 만들기
            </Button>
          </div>
          {progress}
        </>
      )}

      {step === 3 && draft && (
        <>
          <h2 className="mb-1 text-sub text-ink-strong">카드를 확인해 주세요</h2>
          <p className="mb-4 text-[14px] text-ink-body">틀린 곳은 바로 고칠 수 있어요.</p>
          {draft.masked > 0 && <p className="mb-3 text-[13px] font-semibold text-brand-strong">개인정보 {draft.masked}곳을 가렸어요</p>}
          {draft.problems.length > 0 && (
            <div className="mb-4 space-y-2">
              {draft.problems.map((p, i) => (
                <div key={i} className="rounded-xl bg-warning-weak px-4 py-3 text-[14px] text-warning">
                  {p}
                </div>
              ))}
            </div>
          )}
          <div className="mb-4 rounded-xl bg-surface-subtle p-4">
            <p className="mb-1 text-[13px] font-semibold text-ink-weak">내가 남긴 말</p>
            <p className="whitespace-pre-wrap text-[14px] text-ink-body">{raw}</p>
          </div>
          <div className="space-y-4 rounded-card bg-surface p-5">
            <Field label="제목">
              <input className={inputCls} value={draft.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="주제">
              <select className={inputCls} value={draft.topic} onChange={(e) => set('topic', e.target.value)}>
                {[...new Set([...(state?.topics ?? []), draft.topic])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-body">출처</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1">
                {(['공식규정', '현장노하우'] as Source[]).map((s) => (
                  <button key={s} type="button" onClick={() => set('source', s)} className={cx('h-10 rounded-lg text-[14px] font-semibold', draft.source === s ? 'bg-surface text-ink-strong' : 'text-ink-weak')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Field label="상황">
              <textarea className={cx(inputCls, 'min-h-20')} value={draft.situation} onChange={(e) => set('situation', e.target.value)} />
            </Field>
            <div className="rounded-xl border-2 border-brand bg-brand-weak/50 p-3">
              <Field label="판단 이유" hint="판단 이유가 신입에게 가장 도움이 돼요">
                <textarea className={cx(inputCls, 'min-h-24')} value={draft.reason} placeholder="왜 그렇게 하는지 적어 주세요" onChange={(e) => set('reason', e.target.value)} />
              </Field>
            </div>
            <Field label="대응 방법" hint="한 줄에 하나씩 적어요">
              <textarea className={cx(inputCls, 'min-h-24')} value={actionsText} onChange={(e) => setActionsText(e.target.value)} />
            </Field>
            <Field label="하면 안 되는 것">
              <textarea className={cx(inputCls, 'min-h-16')} value={draft.avoid} onChange={(e) => set('avoid', e.target.value)} />
            </Field>
            <Field label="점장을 불러야 할 때">
              <textarea className={cx(inputCls, 'min-h-16')} value={draft.escalateWhen} onChange={(e) => set('escalateWhen', e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[14px] text-ink-body">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={credit} onChange={(e) => setCredit(e.target.checked)} />
              기여 크레딧에 내 이름 표시하기
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(draft.followups.length ? 2 : 1)}>
              이전
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep(1);
                toast('임시 저장해 뒀어요. 나중에 이어서 확인해요');
              }}
            >
              나중에 확인하기
            </Button>
            <Button className="flex-1" loading={busy} disabled={!draft.title.trim()} onClick={() => void submit()}>
              위키에 올리기
            </Button>
          </div>
        </>
      )}

      {step === 4 && (
        <Panel className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-weak text-success">
            <Check size={28} />
          </div>
          <h2 className="text-sub text-ink-strong">{result === 'approved' || person?.role === '점장' ? '바로 위키에 반영됐어요' : '점장 승인 후 위키에 반영돼요'}</h2>
          <p className="mt-2 text-[14px] text-ink-body">남긴 노하우는 이름과 함께 기여 크레딧으로 쌓여요</p>
          <div className="mt-3">{person && <Badge tone="brand">{person.name}</Badge>}</div>
          <Button size="lg" className="mt-6" onClick={reset}>
            하나 더 남기기
          </Button>
        </Panel>
      )}
      {step === 1 && !state && <Empty>불러오는 중이에요</Empty>}
    </div>
  );
}
