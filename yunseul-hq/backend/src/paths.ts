import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BACKEND_DIR = join(here, '..');
export const ROOT_DIR = join(BACKEND_DIR, '..');
export const DATA_DIR = join(ROOT_DIR, 'data');
export const HARNESS_DIR = join(ROOT_DIR, 'harness');
export const STORE_DIR = resolve(BACKEND_DIR, process.env.STORE_DIR ?? 'var');
// 시드 폴더(brand/stores/reviews/standards/knowledge/virtual_after.json). 테스트는 SEED_DIR로 작은 고정 자료를 쓴다
export const SEED_DIR = process.env.SEED_DIR ? resolve(BACKEND_DIR, process.env.SEED_DIR) : join(DATA_DIR, 'seed');
