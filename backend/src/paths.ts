import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BACKEND_DIR = join(here, '..');
export const ROOT_DIR = join(BACKEND_DIR, '..');
export const DATA_DIR = join(ROOT_DIR, 'data');
export const HARNESS_DIR = join(ROOT_DIR, 'harness');
export const STORE_DIR = resolve(BACKEND_DIR, process.env.STORE_DIR ?? 'var');
