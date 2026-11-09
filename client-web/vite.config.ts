import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = fileURLToPath(new URL('../docs/v01/fixtures', import.meta.url));
const repoDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  // Không có file .env thì `npm run dev` chạy mock, bản build mặc định dùng Server thật.
  const useMock = env.VITE_USE_MOCK ?? (mode === 'production' ? 'false' : 'true');

  return {
    base: './',
    define: {
      'import.meta.env.VITE_USE_MOCK': JSON.stringify(useMock),
    },
    resolve: {
      alias: { '@fixtures': fixturesDir },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Fixture nằm ngoài client-web/ (docs/v01/fixtures).
      fs: { allow: [repoDir] },
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      exclude: [...configDefaults.exclude],
    },
  };
});
