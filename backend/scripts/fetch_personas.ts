// 가상 손님의 바탕이 될 한국인 페르소나 표본을 Hugging Face에서 받아 data/personas/에 저장한다.
// 출처: nvidia/Nemotron-Personas-Korea (CC BY 4.0, 100만 명, 통계청 인구 분포 기반 합성 인물)
// 실행: npx tsx scripts/fetch_personas.ts [명수=120]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '../src/paths.js';

const DATASET = 'nvidia/Nemotron-Personas-Korea';
const TOTAL = 1_000_000;
const want = Number(process.argv[2] ?? 120);
const PAGE = 20;

interface Row {
  uuid: string; persona: string; culinary_persona: string; sex: string; age: number;
  occupation: string; province: string; district: string; family_type: string;
}

const people: Row[] = [];
for (let i = 0; people.length < want && i < 50; i++) {
  const offset = Math.floor(Math.random() * (TOTAL - PAGE));
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${PAGE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HF ${res.status} ${await res.text()}`);
  const { rows } = (await res.json()) as { rows: { row: Row }[] };
  for (const { row } of rows) {
    // 카페 손님이 될 법한 나이만 (10대 후반 이상)
    if (row.age < 16 || people.length >= want) continue;
    const { uuid, persona, culinary_persona, sex, age, occupation, province, district, family_type } = row;
    people.push({ uuid, persona, culinary_persona, sex, age, occupation, province, district, family_type });
  }
}

const dir = join(DATA_DIR, 'personas');
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'nemotron-ko-sample.json'),
  JSON.stringify(
    {
      source: `https://huggingface.co/datasets/${DATASET}`,
      license: 'CC BY 4.0 (NVIDIA). 합성 인물이며 실존 인물이 아니다.',
      fetchedAt: new Date().toISOString(),
      people,
    },
    null,
    1,
  ),
);
console.log(`페르소나 ${people.length}명 저장 → data/personas/nemotron-ko-sample.json`);
