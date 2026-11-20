import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  // 테스트 파일이 같은 저장 파일(var/test/store.json)을 쓰므로 파일은 하나씩 돌린다
  test: { environment: 'node', fileParallelism: false, env: { AI_MODE: 'rules', STORE_DIR: 'var/test', SEED_FILE: 'test/fixtures/cafe-seed.json', DEMO_DATE: 'seed' } },
});
