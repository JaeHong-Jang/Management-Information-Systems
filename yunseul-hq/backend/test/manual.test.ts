import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { manualItems } from '@shared/manual';
import type { ManualChecklist } from '@shared/contracts';
import { STORE_DIR } from '../src/paths.js';
import { app } from '../src/server.js';
import * as db from '../src/store/db.js';
import { manualChecklist, setManualCheck } from '../src/store/manual.js';

const storeId = 'S001';
const personId = 'P003';
const itemId = manualItems[0].id;

describe('근무 체크리스트', () => {
  beforeEach(() => { db.resetFromSeed(); });
  afterEach(() => { vi.useRealTimers(); });

  it('공개 자료와 윤슬 절차를 구별하고, 개인 선택 전에도 매뉴얼을 읽을 수 있다', () => {
    const view = manualChecklist(storeId);
    expect(view.personId).toBeNull();
    expect(view.checkedIds).toEqual([]);
    expect(new Set(view.items.map((item) => item.id)).size).toBe(view.items.length);
    for (const item of view.items) {
      if (item.basis === '본사 공개 기준') {
        expect(new URL(item.source!.url).hostname).toBe('yeokjeonfnc.com');
      } else {
        expect(item.source).toBeUndefined();
      }
    }
  });

  it('직원·매장별로 저장하고 같은 항목의 중복 요청과 해제를 멱등 처리한다', () => {
    const { date } = manualChecklist(storeId, personId);
    setManualCheck(storeId, itemId, personId, date, true);
    setManualCheck(storeId, itemId, personId, date, true);
    setManualCheck(storeId, itemId, 'P002', date, true);
    expect(db.get().manualChecks).toHaveLength(2);
    db.load();
    expect(manualChecklist(storeId, personId).checkedIds).toEqual([itemId]);
    expect(manualChecklist('S003', 'P020').checkedIds).toEqual([]);
    expect(manualChecklist(storeId).checkedIds).toEqual([]);
    setManualCheck(storeId, itemId, personId, date, false);
    setManualCheck(storeId, itemId, personId, date, false);
    db.load();
    expect(manualChecklist(storeId, personId).checkedIds).toEqual([]);
    expect(manualChecklist(storeId, 'P002').checkedIds).toEqual([itemId]);
  });

  it('한국 자정 경계에서 다음 날은 빈 체크리스트이고 전날 요청은 거절한다', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T14:59:59.000Z'));
    expect(setManualCheck(storeId, itemId, personId, '2026-11-20', true).date).toBe('2026-11-20');
    vi.setSystemTime(new Date('2026-11-20T15:00:00.000Z'));
    expect(manualChecklist(storeId, personId)).toMatchObject({ date: '2026-11-21', checkedIds: [] });
    expect(() => setManualCheck(storeId, itemId, personId, '2026-11-20', false)).toThrow(/근무일이 변경/);
    expect(db.get().manualChecks).toHaveLength(1);
  });

  it('체크리스트가 추가되기 전에 저장한 매장과 직원 기록을 보존한다', () => {
    const file = join(STORE_DIR, 'store.json');
    const old = JSON.parse(readFileSync(file, 'utf8'));
    delete old.manualChecks;
    old.people[0].name = '기존 직원';
    writeFileSync(file, JSON.stringify(old));
    expect(db.load().fresh).toBe(false);
    expect(db.get().people[0].name).toBe('기존 직원');
    expect(manualChecklist(storeId, personId).checkedIds).toEqual([]);
  });

  it('HTTP GET·PUT 계약과 잘못된 매장·직원·항목·날짜·확인 상태를 검증한다', async () => {
    const server = app.listen(0);
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api/stores/';
    const url = base + storeId + '/manual';
    const put = (id: string, data: unknown) => fetch(url + '/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    try {
      const response = await fetch(url + '?personId=' + personId);
      expect(response.status).toBe(200);
      const state = await response.json() as ManualChecklist;
      const change = { personId, date: state.date, checked: true };
      expect(await (await put(itemId, change)).json()).toMatchObject({ checkedIds: [itemId] });
      expect((await fetch(base + 'missing/manual')).status).toBe(404);
      expect((await fetch(url + '?personId=P020')).status).toBe(400);
      expect((await put(itemId, { ...change, personId: 'P020' })).status).toBe(400);
      expect((await put(itemId, { ...change, personId: undefined })).status).toBe(400);
      expect((await put('missing', change)).status).toBe(404);
      expect((await put(itemId, { ...change, date: 'invalid' })).status).toBe(400);
      expect((await put(itemId, { ...change, date: '2000-01-01' })).status).toBe(409);
      expect((await put(itemId, { ...change, checked: 'false' })).status).toBe(400);
      expect((await (await fetch(url + '?personId=' + personId)).json()).checkedIds).toEqual([itemId]);
    } finally {
      server.close();
    }
  });
});
