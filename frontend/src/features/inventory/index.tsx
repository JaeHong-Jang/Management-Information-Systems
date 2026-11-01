// 재고·발주: 오늘 무엇을 얼마나 주문할지. 숫자는 POS 판매 × 메뉴별 소모량과 마감 실사로 계산하고,
// 평소보다 늘려 잡을 이유는 승인된 사례 카드에서만 가져온다(점장이 승인해야 반영).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList, Copy, FileUp, Plus } from 'lucide-react';
import type { Adjustment, InventoryView, ItemStatus, LintIssue, Order, Recipe, RecipeLine, StockLevel } from '@shared/contracts';
import { api } from '@/shared/api/client';
import { useLive } from '@/shared/api/live';
import { Badge, Button, CardDetail, Empty, Field, PageHeader, Panel, Sheet, cx, fmtTime, inputCls, useToast } from '@/shared/ui';
import { CHART } from '@/shared/theme/tokens';

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

// 색 하나에 뜻 하나: 빨강 = 막힘(도착 전에 바닥), 주황 = 사람 손이 필요(오늘 주문), 나머지는 회색
const LEVEL: Record<StockLevel, { label: (s: ItemStatus) => string; tone: 'danger' | 'warning' | 'neutral'; bar: string }> = {
  out: { label: () => '도착 전 바닥', tone: 'danger', bar: 'bg-danger-mark' },
  today: { label: () => '오늘 주문', tone: 'warning', bar: 'bg-warning-mark' },
  soon: { label: (s) => `${s.orderInDays}일 뒤 주문`, tone: 'neutral', bar: 'bg-grey-500' },
  ok: { label: () => '여유', tone: 'neutral', bar: 'bg-grey-300' },
};

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function InventoryPage() {
  const { state, me } = useLive();
  const toast = useToast();
  const [view, setView] = useState<InventoryView | null>(null);
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [v, l] = await Promise.all([api.inventory(), api.inventoryIssues()]);
    setView(v);
    setIssues(l);
  }, []);
  // 다른 화면이나 하루 재생에서 바뀌어도 따라온다(실행이 끝나면 state가 새로 온다)
  useEffect(() => void load(), [load, state]);

  const run = async <T,>(key: string, fn: () => Promise<T>, done: (r: T) => string) => {
    setBusy(key);
    try {
      const r = await fn();
      toast(done(r));
      await load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const upload = (f: File) =>
    run('pos', async () => api.posUpload(f.name, toBase64(await f.arrayBuffer()), me), (r) => `판매 ${r.import.rows}줄 반영 · 새 메뉴 ${r.newRecipes.length} · 보정 제안 ${r.proposals.length} · 주문서 ${r.orders.length}장`);
  const sample = () => run('pos', () => api.posSample(me), (r) => `이번 주 판매 ${r.import.rows}줄 반영 · 새 메뉴 ${r.newRecipes.length} · 보정 제안 ${r.proposals.length} · 주문서 ${r.orders.length}장`);

  if (!view || !state) return null;
  const items = view.items;
  const name = (id: string) => items.find((s) => s.item.id === id)?.item.name ?? id;
  const due = items.filter((s) => s.level === 'today' || s.level === 'out');
  const out = items.filter((s) => s.level === 'out');
  const soon = items.filter((s) => s.level === 'soon');
  const lastImport = view.imports.at(-1);
  const pendingAdj = view.adjustments.filter((a) => a.status === 'pending');
  const pendingRecipes = view.recipes.filter((r) => r.status === 'pending');
  const diffs = issues.filter((i) => i.kind === '재고 차이');
  const drifts = issues.filter((i) => i.kind === '사용량 이탈');
  const needsManager = pendingAdj.length + pendingRecipes.length + diffs.length + drifts.length;
  const sorted = [...items].sort((a, b) => (a.orderInDays ?? 99) - (b.orderInDays ?? 99) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const open = items.find((s) => s.item.id === openItem) ?? null;
  const card = state.cards.find((c) => c.id === cardId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="관리"
        title="재고·발주"
        desc="POS 판매와 마감 실사로 남은 양을 계산하고 주문할 날과 양을 알려 줘요. 숫자는 계산 규칙이 정하고, 평소보다 늘려 잡는 이유는 승인된 사례 카드에서만 가져와요."
        action={
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0]).finally(() => (e.target.value = ''))} />
            <Button variant="ghost" onClick={() => setCounting(true)}>
              <ClipboardList size={16} /> 마감 재고 세기
            </Button>
            <Button loading={busy === 'pos'} onClick={() => fileRef.current?.click()}>
              <FileUp size={16} /> POS 파일 올리기
            </Button>
          </div>
        }
      />

      {/* 한 문장: 오늘 무엇을 주문하나 */}
      <section className="mb-5 rounded-card bg-surface p-6 sm:p-8">
        <p className="text-[14px] font-semibold text-brand">{fmtTime(view.today)}</p>
        <h1 className="mt-2 text-[26px] font-bold leading-[36px] tracking-tight text-ink-strong sm:text-[30px] sm:leading-[40px]">
          {due.length ? (
            <>
              오늘 주문할 품목 <span className="text-warning">{due.length}개</span>
            </>
          ) : (
            '오늘 주문할 품목이 없어요'
          )}
        </h1>
        <p className="mt-2 text-[15px] text-ink-body">
          {out.length ? `${out.map((s) => s.item.name).join(', ')}은 지금 주문해도 도착 전에 바닥날 수 있어요. ` : ''}
          {soon.length ? `3일 안에 주문할 품목 ${soon.length}개. ` : ''}
          {view.pendingMenus.length ? `소모량 승인 전 메뉴(${view.pendingMenus.join(', ')})는 아직 계산에 안 들어가요. ` : ''}
          {items.some((s) => s.estimatedDays > 0) ? `POS를 아직 안 올린 ${Math.max(...items.map((s) => s.estimatedDays))}일은 요일별 평균으로 추정했어요.` : ''}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-weak">
          <span className="rounded-lg bg-surface-subtle px-3 py-1.5">
            마지막 POS 반영 · {lastImport ? `${lastImport.file}${lastImport.days.length ? ` (${fmtTime(lastImport.days[0])}~${fmtTime(lastImport.days.at(-1)!)})` : ''}` : '없음'}
          </span>
          <button onClick={() => void sample()} disabled={busy === 'pos'} className="font-semibold text-brand-strong disabled:opacity-40">
            예시 파일(이번 주 판매)로 해 보기
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px] [&>*]:min-w-0">
        <div className="space-y-5">
          <Panel title="품목별 남은 양">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_90px_minmax(0,1fr)_110px_90px] gap-3 px-3 pb-2 text-[12px] font-semibold text-ink-weak md:grid">
              <span>품목</span>
              <span className="text-right">남은 양</span>
              <span>남은 일수</span>
              <span>주문</span>
              <span className="text-right">권장량</span>
            </div>
            <ul className="-mx-1 space-y-1">
              {sorted.map((s) => (
                <li key={s.item.id}>
                  <button onClick={() => setOpenItem(s.item.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-3 text-left hover:bg-surface-subtle md:grid-cols-[minmax(0,1.4fr)_90px_minmax(0,1fr)_110px_90px]">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink-strong">{s.item.name}</span>
                      <span className="text-[12px] text-ink-weak">
                        {s.item.supplier} · 리드타임 {s.item.leadDays}일
                        {s.activeAdjustments.length ? ` · ${[...new Set(s.activeAdjustments.map((a) => `${a.reason} ×${a.factor}`))].join(', ')}` : ''}
                      </span>
                    </span>
                    <span className="text-right text-[15px] font-semibold text-ink-strong">
                      {num(s.stock)}
                      <span className="ml-0.5 text-[12px] font-medium text-ink-weak">{s.item.unit}</span>
                    </span>
                    <span className="col-span-2 flex items-center gap-2 md:col-span-1">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <span className={cx('block h-full min-w-[8px] rounded-full', LEVEL[s.level].bar)} style={{ width: `${(Math.min(s.daysLeft ?? 14, 7) / 7) * 100}%` }} />
                      </span>
                      <span className="w-14 text-right text-[13px] text-ink-body">{s.daysLeft === null ? '14일+' : `${num(s.daysLeft)}일`}</span>
                    </span>
                    <span>
                      <Badge tone={LEVEL[s.level].tone}>{LEVEL[s.level].label(s)}</Badge>
                    </span>
                    <span className="text-right text-[14px] text-ink-body">{s.level === 'ok' ? '-' : `${s.suggestPacks}${s.item.packLabel}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="주문서 초안">
            <p className="mb-3 text-[13px] text-ink-weak">발주 담당이 거래처별로 묶었어요. 확인하고 직접 보내 주세요. 보낸 주문은 입고 예정으로 계산돼요.</p>
            {view.orders.filter((o) => o.status !== 'received').length === 0 ? (
              <Empty>오늘 보낼 주문서가 없어요</Empty>
            ) : (
              <ul className="space-y-3">
                {view.orders
                  .filter((o) => o.status !== 'received')
                  .map((o) => (
                    <OrderCard key={o.id} order={o} name={name} items={items} storeName={state.store.name} busy={busy} onCite={setCardId}
                      onAct={(action) => run(o.id + action, () => api.order(o.id, action), () => (action === 'send' ? '보낸 주문으로 표시했어요. 입고 예정으로 계산돼요' : '입고를 확인했어요'))} />
                  ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="점장 확인이 필요해요" action={needsManager ? <Badge tone="warning">{needsManager}건</Badge> : undefined}>
            {needsManager === 0 ? (
              <Empty>확인할 일이 없어요</Empty>
            ) : (
              <div className="space-y-4">
                {groupAdjustments(pendingAdj).map((g) => (
                  <div key={g.key} className="rounded-xl bg-surface-subtle p-4">
                    <p className="text-[12px] font-semibold text-ink-weak">수요 분석가의 보정 제안</p>
                    <p className="mt-1 text-[15px] font-semibold text-ink-strong">
                      {g.reason} · ×{g.factor}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-body">
                      {fmtTime(g.from)}
                      {g.to !== g.from ? `~${fmtTime(g.to)}` : ''} · {g.list.map((a) => name(a.itemId)).join(', ')}
                    </p>
                    <button onClick={() => setCardId(g.cardId)} className="mt-1 text-[13px] font-semibold text-brand-strong">
                      근거 카드 {g.cardId} 보기
                    </button>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" loading={busy === g.key + 'approve'} onClick={() => void run(g.key + 'approve', async () => { for (const a of g.list) await api.adjustment(a.id, 'approve'); }, () => '보정을 예측에 넣었어요')}>
                        승인하기
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" loading={busy === g.key + 'reject'} onClick={() => void run(g.key + 'reject', async () => { for (const a of g.list) await api.adjustment(a.id, 'reject'); }, () => '보정 제안을 반려했어요')}>
                        반려하기
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingRecipes.map((r) => (
                  <RecipeEditor key={r.menu} recipe={r} items={items} busy={busy === 'recipe' + r.menu}
                    onApprove={(lines) => run('recipe' + r.menu, () => api.approveRecipe(r.menu, lines), () => `${r.menu} 판매가 사용량에 들어가요`)} />
                ))}
                {diffs.map((i) => (
                  <DiffExplainer key={i.ids[0]} issue={i} busy={busy === 'diff' + i.ids[0]} onCite={setCardId}
                    onSubmit={(reason) => run('diff' + i.ids[0], () => api.explainStock(i.ids[0], reason, me), (c) => `[${c.id}] 재고·발주 카드가 됐어요`)} />
                ))}
                {drifts.map((i) => (
                  <div key={i.ids[0]} className="rounded-xl bg-surface-subtle p-4">
                    <p className="text-[12px] font-semibold text-ink-weak">사용량이 평소와 달라요</p>
                    <p className="mt-1 text-[14px] text-ink-strong">{i.detail}</p>
                    <Link to="/record" className="mt-2 inline-block text-[13px] font-semibold text-brand-strong">
                      노하우 남기기에서 이유 적기
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="다가오는 매장 일정">
            {view.events.filter((e) => e.to >= view.today).length === 0 ? (
              <Empty>등록된 일정이 없어요</Empty>
            ) : (
              <ul className="space-y-2">
                {view.events
                  .filter((e) => e.to >= view.today)
                  .map((e) => {
                    const adj = view.adjustments.filter((a) => a.reason === e.label && a.status !== 'rejected');
                    return (
                      <li key={e.label} className="flex items-center justify-between gap-3 rounded-xl bg-surface-subtle px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-ink-strong">{e.label}</span>
                          <span className="text-[12px] text-ink-weak">
                            {fmtTime(e.from)}
                            {e.to !== e.from ? `~${fmtTime(e.to)}` : ''}
                          </span>
                        </span>
                        {adj.length ? (
                          <Badge tone={adj.some((a) => a.status === 'approved') ? 'success' : 'warning'}>{adj.some((a) => a.status === 'approved') ? `×${adj[0].factor} 반영` : '승인 대기'}</Badge>
                        ) : (
                          <Badge>보정 없음</Badge>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-ink-weak">POS 파일을 올리면 수요 분석가가 일정에 맞는 재고 카드를 찾아 보정을 제안해요.</p>
          </Panel>
        </div>
      </div>

      <Sheet open={!!open} onClose={() => setOpenItem(null)}>
        {open && <ItemDetail s={open} today={view.today} onCite={setCardId} onSaved={() => void load()} />}
      </Sheet>
      <Sheet open={counting} onClose={() => setCounting(false)}>
        <StocktakeForm items={items} busy={busy === 'count'}
          onSubmit={(counts) => run('count', () => api.stocktake(counts, me), (r) => { setCounting(false); return r.issues.length ? `차이 큰 품목 ${r.issues.length}개를 점장 확인에 올렸어요` : '계산과 실사가 비슷해요'; })} />
      </Sheet>
      <Sheet open={!!card} onClose={() => setCardId(null)}>
        {card && <CardDetail card={card} authorName={state.people.find((p) => p.id === card.authorId)?.name} />}
      </Sheet>
    </div>
  );
}

function groupAdjustments(list: Adjustment[]) {
  const m = new Map<string, { key: string; reason: string; factor: number; from: string; to: string; cardId: string; list: Adjustment[] }>();
  for (const a of list) {
    const key = `${a.reason}|${a.factor}|${a.from}|${a.to}|${a.cardId}`;
    const g = m.get(key) ?? { key, reason: a.reason, factor: a.factor, from: a.from, to: a.to, cardId: a.cardId, list: [] };
    g.list.push(a);
    m.set(key, g);
  }
  return [...m.values()];
}

function OrderCard({ order, name, items, storeName, busy, onAct, onCite }: { order: Order; name: (id: string) => string; items: ItemStatus[]; storeName: string; busy: string | null; onAct: (a: 'send' | 'receive') => void; onCite: (id: string) => void }) {
  const toast = useToast();
  const unit = (id: string) => items.find((s) => s.item.id === id)?.item;
  const text = [`[${order.supplier}] ${fmtTime(order.date)} 주문 부탁드립니다`, ...order.lines.map((l) => `- ${name(l.itemId)} ${l.packs}${unit(l.itemId)?.packLabel ?? ''}`), storeName.replace(/ \(.*\)$/, '')].join('\n');
  return (
    <li className="rounded-xl bg-surface-subtle p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-ink-strong">{order.supplier}</p>
        <Badge tone={order.status === 'sent' ? 'brand' : 'warning'}>{order.status === 'sent' ? `${fmtTime(order.date)} 보냄 · 입고 대기` : '초안'}</Badge>
      </div>
      <ul className="space-y-2">
        {order.lines.map((l) => (
          <li key={l.itemId}>
            <p className="text-[14px] font-semibold text-ink-strong">
              {name(l.itemId)} {l.packs}
              {unit(l.itemId)?.packLabel} <span className="font-normal text-ink-weak">({num(l.qty)}{unit(l.itemId)?.unit})</span>
            </p>
            <p className="text-[12px] text-ink-weak">
              {l.why.split(/(\[C\d{3,}\])/).map((part, i) => {
                const m = part.match(/^\[(C\d{3,})\]$/);
                return m ? (
                  <button key={i} onClick={() => onCite(m[1])} className="mx-0.5 rounded bg-brand-weak px-1 font-semibold text-brand-strong">
                    {m[1]}
                  </button>
                ) : (
                  <span key={i}>{part}</span>
                );
              })}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        {order.status === 'draft' ? (
          <>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => void navigator.clipboard.writeText(text).then(() => toast('주문 문자를 복사했어요'))}>
              <Copy size={14} /> 문자로 복사
            </Button>
            <Button size="sm" className="flex-1" loading={busy === order.id + 'send'} onClick={() => onAct('send')}>
              보냈어요
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" className="flex-1" loading={busy === order.id + 'receive'} onClick={() => onAct('receive')}>
            입고 확인하기
          </Button>
        )}
      </div>
    </li>
  );
}

function RecipeEditor({ recipe, items, busy, onApprove }: { recipe: Recipe; items: ItemStatus[]; busy: boolean; onApprove: (lines: RecipeLine[]) => void }) {
  const [lines, setLines] = useState<RecipeLine[]>(recipe.lines.length ? recipe.lines : [{ itemId: items[0]?.item.id ?? '', qty: 1 }]);
  const set = (i: number, patch: Partial<RecipeLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="rounded-xl bg-surface-subtle p-4">
      <p className="text-[12px] font-semibold text-ink-weak">처음 보는 메뉴 · 레시피 편집자 초안{recipe.via.startsWith('rules(') ? ` (${recipe.via.slice(6, -1)})` : ''}</p>
      <p className="mt-1 text-[15px] font-semibold text-ink-strong">{recipe.menu} 1개에 드는 양</p>
      <div className="mt-2 space-y-2">
        {lines.map((l, i) => {
          const it = items.find((s) => s.item.id === l.itemId)?.item;
          return (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_88px_24px] items-center gap-2">
              <select className={cx(inputCls, 'h-11 min-w-0 py-0 text-[14px]')} value={l.itemId} onChange={(e) => set(i, { itemId: e.target.value })}>
                {items.map((s) => (
                  <option key={s.item.id} value={s.item.id}>
                    {s.item.name}
                  </option>
                ))}
              </select>
              <input className={cx(inputCls, 'h-11 py-0 text-right')} type="number" step="0.005" min="0" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} />
              <span className="text-[13px] text-ink-weak">{it?.unit}</span>
            </div>
          );
        })}
      </div>
      <button onClick={() => setLines((ls) => [...ls, { itemId: items[0]?.item.id ?? '', qty: 1 }])} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-strong">
        <Plus size={14} /> 재료 더하기
      </button>
      <Button size="sm" className="mt-3 w-full" loading={busy} disabled={!lines.some((l) => l.qty > 0)} onClick={() => onApprove(lines.filter((l) => l.qty > 0))}>
        이 양으로 승인하기
      </Button>
    </div>
  );
}

function DiffExplainer({ issue, busy, onSubmit, onCite }: { issue: LintIssue; busy: boolean; onSubmit: (reason: string) => void; onCite: (id: string) => void }) {
  const [reason, setReason] = useState('');
  const prev = issue.detail.match(/지난번 이유: \[(C\d+)\]/)?.[1];
  return (
    <div className="rounded-xl bg-surface-subtle p-4">
      <p className="text-[12px] font-semibold text-ink-weak">마감 실사가 계산과 달라요</p>
      <p className="mt-1 text-[14px] text-ink-strong">{issue.detail.replace(/ 지난번 이유: \[C\d+\]/, '')}</p>
      {prev && (
        <button onClick={() => onCite(prev)} className="mt-1 text-[13px] font-semibold text-brand-strong">
          지난번에 남긴 이유 {prev} 보기
        </button>
      )}
      <textarea className={cx(inputCls, 'mt-3 min-h-16')} placeholder="차이가 난 이유 (예: 단체 손님 서비스 소주를 POS에 안 찍었다)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button size="sm" className="mt-2 w-full" loading={busy} disabled={!reason.trim()} onClick={() => onSubmit(reason)}>
        이유를 카드로 남기기
      </Button>
    </div>
  );
}

function ItemDetail({ s, today, onCite, onSaved }: { s: ItemStatus; today: string; onCite: (id: string) => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ reorderPoint: String(s.item.reorderPoint), par: String(s.item.par), leadDays: String(s.item.leadDays) });
  const [saving, setSaving] = useState(false);
  const week = useMemo(() => WEEK.map((d, i) => ({ d, qty: s.byWeekday[i] })), [s]);
  const save = async () => {
    setSaving(true);
    try {
      await api.updateItem(s.item.id, { reorderPoint: Number(form.reorderPoint), par: Number(form.par), leadDays: Number(form.leadDays) });
      toast('기준값을 바꿨어요');
      onSaved();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const u = s.item.unit;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Badge tone={LEVEL[s.level].tone}>{LEVEL[s.level].label(s)}</Badge>
        <span className="text-[13px] text-ink-weak">
          {s.item.category} · {s.item.supplier} · 1{s.item.packLabel} = {s.item.pack}
          {u}
        </span>
      </div>
      <h3 className="text-sub text-ink-strong">{s.item.name}</h3>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['남은 양', `${num(s.stock)}${u}`],
          ['하루 평균', `${num(s.dailyAvg)}${u}`],
          ['남은 일수', s.daysLeft === null ? '14일+' : `${num(s.daysLeft)}일`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-subtle p-3">
            <p className="text-[12px] text-ink-weak">{k}</p>
            <p className="text-[17px] font-bold text-ink-strong">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[14px] text-ink-body">
        {s.orderInDays === null ? '2주 안에는 주문할 필요가 없어요.' : s.orderInDays === 0 ? `오늘 ${s.suggestPacks}${s.item.packLabel} 주문을 권해요.` : `${fmtTime(s.orderDate!)}에 ${s.suggestPacks}${s.item.packLabel} 주문을 권해요.`}
        {s.incoming.length ? ` 입고 예정 ${s.incoming.map((x) => `${fmtTime(x.date)} ${num(x.qty)}${u}`).join(', ')}.` : ''}
      </p>

      <p className="mt-5 text-[13px] font-semibold text-ink-body">요일별 평균 사용량 (최근 4주)</p>
      <div className="mt-1 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={week} margin={{ left: -24, right: 4, top: 4 }}>
            <XAxis dataKey="d" stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => [`${num(v)}${u}`, '평균']} contentStyle={{ borderRadius: 12, border: `1px solid ${CHART.line}`, fontSize: 13 }} cursor={{ fill: CHART.hover }} />
            <Bar dataKey="qty" fill={CHART.brand} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 text-[13px] font-semibold text-ink-body">앞으로 7일 예상 사용량</p>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {s.forecast.slice(0, 7).map((f) => (
          <div key={f.date} className={cx('rounded-lg px-1 py-2 text-center', f.factor > 1 ? 'bg-warning-weak' : 'bg-surface-subtle')}>
            <p className="text-[11px] text-ink-weak">{f.date === today ? '오늘' : `${Number(f.date.slice(8))}일`}</p>
            <p className="text-[13px] font-semibold text-ink-strong">{num(f.qty)}</p>
            {f.factor > 1 && <p className="text-[11px] font-semibold text-warning">×{f.factor}</p>}
          </div>
        ))}
      </div>
      {s.activeAdjustments.length > 0 && (
        <p className="mt-2 text-[12px] text-ink-weak">
          보정 근거:{' '}
          {[...new Map(s.activeAdjustments.map((a) => [a.cardId, a])).values()].map((a) => (
            <button key={a.cardId} onClick={() => onCite(a.cardId)} className="mr-1 rounded bg-brand-weak px-1.5 font-semibold text-brand-strong">
              {a.cardId} {a.reason}
            </button>
          ))}
        </p>
      )}

      <p className="mt-5 text-[13px] font-semibold text-ink-body">기준값</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Field label={`발주점(${u})`} hint={`추천 ${s.suggested.reorderPoint}`}>
          <input className={inputCls} type="number" min="0" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: e.target.value }))} />
        </Field>
        <Field label={`적정량(${u})`} hint={`추천 ${s.suggested.par}`}>
          <input className={inputCls} type="number" min="1" value={form.par} onChange={(e) => setForm((f) => ({ ...f, par: e.target.value }))} />
        </Field>
        <Field label="리드타임(일)">
          <input className={inputCls} type="number" min="0" value={form.leadDays} onChange={(e) => setForm((f) => ({ ...f, leadDays: e.target.value }))} />
        </Field>
      </div>
      <p className="mt-1 text-[12px] text-ink-weak">추천값은 발주점 = 하루 평균 × (리드타임 + 1), 적정량 = 하루 평균 × 7이에요.</p>
      <Button size="sm" variant="secondary" className="mt-2 w-full" loading={saving} onClick={() => void save()}>
        기준값 저장하기
      </Button>

      {s.cardIds.length > 0 && (
        <>
          <p className="mt-5 text-[13px] font-semibold text-ink-body">이 품목의 판단 근거 카드</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.cardIds.map((id) => (
              <button key={id} onClick={() => onCite(id)} className="rounded-lg bg-brand-weak px-2 py-1 text-[13px] font-semibold text-brand-strong">
                {id}
              </button>
            ))}
          </div>
        </>
      )}
      {s.lastCount && (
        <p className="mt-4 text-[12px] text-ink-weak">
          마지막 실사 {fmtTime(s.lastCount.date)} 마감 · 실사 {num(s.lastCount.counted)}
          {u} / 계산 {num(s.lastCount.expected)}
          {u}
        </p>
      )}
    </div>
  );
}

function StocktakeForm({ items, busy, onSubmit }: { items: ItemStatus[]; busy: boolean; onSubmit: (counts: { itemId: string; counted: number }[]) => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const filled = Object.entries(vals).filter(([, v]) => v.trim() !== '' && Number.isFinite(Number(v)));
  return (
    <div>
      <h3 className="text-sub text-ink-strong">마감 재고 세기</h3>
      <p className="mt-1 text-[14px] text-ink-body">센 품목만 적어도 돼요. 냉장고와 창고를 따로 세서 더해 주세요. 회색 숫자는 오늘 마감 때 예상 재고예요. 크게 다르면 점장 확인에 올라가요.</p>
      <ul className="mt-4 space-y-2">
        {items.map((s) => (
          <li key={s.item.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-strong">{s.item.name}</span>
            <input className={cx(inputCls, 'w-28 py-2 text-right')} type="number" min="0" step="any" placeholder={`예상 ${num(s.closing)}`} value={vals[s.item.id] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [s.item.id]: e.target.value }))} />
            <span className="w-6 text-[13px] text-ink-weak">{s.item.unit}</span>
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-4" loading={busy} disabled={!filled.length} onClick={() => onSubmit(filled.map(([itemId, v]) => ({ itemId, counted: Number(v) })))}>
        {filled.length ? `${filled.length}개 품목 저장하기` : '센 수량을 적어 주세요'}
      </Button>
    </div>
  );
}
