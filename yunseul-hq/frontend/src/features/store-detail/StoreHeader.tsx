import { Link } from 'react-router-dom';
import { BookOpen, FileSearch, Home, Siren, Star } from 'lucide-react';
import type { Store, StoreScore } from '@shared/contracts';
import { CrossChip, RiskBadge, RiskBar, Tag, TrendMark } from '@/shared/ui';
import { pct, rating } from '@/shared/lib/format';
import { HIGH_RISK } from '@/shared/theme/semantics';

const link = 'inline-flex items-center gap-1 rounded-ctl border border-line-strong bg-surface px-3 h-10 text-caption text-ink hover:bg-ink-weak';

export function StoreHeader({ store: s, score, ranked }: { store: Store; score: StoreScore; ranked: number | null }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-display text-ink">{s.name}</h1>
            <span className="font-mono text-[0.75rem] tracking-[0.14em] text-text-muted">· STORE</span>
            {s.isTarget && <Tag tone="ink">시연 타깃</Tag>}
            <RiskBadge risk={score.risk} />
            {s.excluded && <Tag title={s.excluded}>분석 제외: {s.excluded}</Tag>}
          </div>
          <p className="mt-1 text-body text-text-subtle">
            {s.region} {s.district} · {s.area} · {score.rank != null ? `전국 ${score.rank}위${ranked ? ` / ${ranked}곳` : ''}` : '순위 대상 아님(표본 부족 또는 분석 제외)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={link} to={`/hq/reviews?storeId=${s.id}`}><FileSearch size={14} aria-hidden />리뷰 보기</Link>
          <Link className={link} to={`/store/${s.id}/wiki`}><BookOpen size={14} aria-hidden />매장 위키</Link>
          {s.isTarget && <Link className={link} to={`/store/${s.id}/manager`}><Home size={14} aria-hidden />점장 화면</Link>}
        </div>
      </div>

      {score.risk >= HIGH_RISK && (
        <p className="mt-3 flex items-center gap-2 border-l-4 border-red bg-surface px-3 py-1.5 text-body font-medium text-red">
          <Siren size={14} aria-hidden />
          고위험: 위험 점수 {Math.round(score.risk)}점으로 기준(60점)을 넘었어요.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-5">
        <div>
          <dt className="text-caption text-text-muted">위험 점수</dt>
          <dd className="mt-1"><RiskBar risk={score.risk} width="w-28" /></dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">카카오 평점</dt>
          <dd className="num mt-1 inline-flex items-center gap-1 font-bold">
            <Star size={13} className="text-text-muted" aria-hidden />
            {rating(s.kakao.rating)} <span className="font-normal text-text-muted">({s.kakao.count.toLocaleString()}건 · 2점 이하 {pct(s.kakao.lowShare)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">네이버 첫 페이지</dt>
          <dd className="num mt-1 font-bold">
            {s.naver.matched ? (
              <>
                {rating(s.naver.pageMean)} <span className="font-normal text-text-muted">({s.naver.pageN}건 · 저평점 {s.naver.pageLow})</span>
              </>
            ) : (
              <span className="font-normal text-text-muted">미매칭</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">교차 판정</dt>
          <dd className="mt-1"><CrossChip cross={s.cross} /></dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">최근 추세(2025년 이후 {rating(s.kakao.recentMean)})</dt>
          <dd className="mt-1"><TrendMark trend={score.trend} /></dd>
        </div>
      </dl>
    </section>
  );
}
