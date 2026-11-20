import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// WSL에서 /mnt/c 아래 파일 변경을 잡으려면 polling이 필요하다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5176, strictPort: true, proxy: { '/api': 'http://localhost:8788' }, watch: { usePolling: true } },
  preview: { port: 5176, proxy: { '/api': 'http://localhost:8788' } },
});
