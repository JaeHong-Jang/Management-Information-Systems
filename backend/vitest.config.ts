import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  test: { environment: 'node', env: { AI_MODE: 'rules', STORE_DIR: 'var/test' } },
});
