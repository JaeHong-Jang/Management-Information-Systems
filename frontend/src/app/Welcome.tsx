// 처음 들어온 사람에게 역할부터 묻는다. 역할마다 첫 화면과 메뉴가 달라진다.
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLive } from '@/shared/api/live';
import { ROLE_HOME } from './nav';

const CHOICES = [
  { role: '신입', personId: 'P005', title: '신입이에요', desc: '일하다 막히면 물어보고, 선배들이 남긴 이유까지 볼 수 있어요' },
  { role: '숙련', personId: 'P002', title: '오래 일한 직원이에요', desc: '방금 처리한 일을 짧게 남기면 AI가 정리해요' },
  { role: '점장', personId: 'P001', title: '점장이에요', desc: '대기 중인 질문에 답하고, 위키에 올라갈 카드를 확인해요' },
] as const;

export function Welcome() {
  const { state, setMe, setMode } = useLive();
  const nav = useNavigate();
  const pick = (personId: string, role: string) => {
    setMode('work');
    setMe(personId);
    nav(ROLE_HOME[role]);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-5">
      <div className="w-full max-w-md">
        <p className="text-caption text-brand-strong">{state?.store.name ?? '이어받기'}</p>
        <h1 className="mt-1 text-title">어떤 일로 오셨어요?</h1>
        <p className="mt-1.5 text-body text-ink-body">고르면 그 역할에 필요한 화면만 보여 드릴게요. 나중에 바꿀 수 있어요.</p>
        <div className="mt-6 space-y-2.5">
          {CHOICES.map((c) => (
            <button key={c.role} onClick={() => pick(c.personId, c.role)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-5 text-left transition-colors hover:bg-brand-weak">
              <div className="flex-1">
                <p className="text-[17px] font-bold text-ink-strong">{c.title}</p>
                <p className="mt-0.5 text-[14px] text-ink-weak">{c.desc}</p>
              </div>
              <ChevronRight className="text-ink-disabled" size={20} />
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setMode('demo');
            setMe('P005');
            nav('/');
          }}
          className="mt-6 w-full rounded-xl py-3 text-[14px] font-semibold text-ink-weak hover:bg-surface-subtle"
        >
          시연·심사용으로 전체 둘러보기
        </button>
      </div>
    </div>
  );
}
