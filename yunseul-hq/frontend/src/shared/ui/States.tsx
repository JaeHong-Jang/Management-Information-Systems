import type { ReactNode } from 'react';
import { CircleAlert, Inbox, Loader2, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export function Loading({ label = '자료 조회 중' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-body text-text-muted" role="status">
      <Loader2 size={16} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-ctl border border-line bg-surface-sunken px-5 py-5 text-body text-text-muted">
      <span className="inline-flex items-center gap-2 font-medium text-text-subtle">
        <Inbox size={16} aria-hidden />
        {title}
      </span>
      {children}
    </div>
  );
}

/** 오류는 빨강이 아니라 주의 색 + 아이콘 + '오류' 글자 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-amber-bar bg-amber-weak px-4 py-4 text-body text-amber-text" role="alert">
      <span className="inline-flex items-center gap-2 font-bold">
        <CircleAlert size={16} aria-hidden />
        자료 조회 실패
      </span>
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" icon={RotateCcw} onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-1 text-caption text-amber-text" role="alert">
      <CircleAlert size={13} aria-hidden />
      오류: {message}
    </p>
  );
}

/** 데이터 화면 공통: 로딩/오류/본문 */
export function AsyncView<T>({ state, children }: { state: { data: T | null; error: string | null; loading: boolean; reload: () => void }; children: (data: T) => ReactNode }) {
  if (state.data) return <>{children(state.data)}</>;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return <Loading />;
}
