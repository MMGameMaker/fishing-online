import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const repoDir = fileURLToPath(new URL('..', import.meta.url));
const fixturesDir = fileURLToPath(new URL('../docs/v01/fixtures', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  // Fishing Online (fishing.html): không có file .env thì dev chạy mock, build dùng Server thật.
  const useMock = env.VITE_USE_MOCK ?? (mode === 'production' ? 'false' : 'true');

  return {
    define: {
      'import.meta.env.VITE_USE_MOCK': JSON.stringify(useMock),
    },
    resolve: {
      alias: { '@fixtures': fixturesDir },
    },
    server: {
      port: 5173,
      proxy: {
        '/socket.io': { target: 'http://localhost:3001', ws: true },
      },
      // Fixture Fishing Online nằm ngoài client-v0 (docs/v01/fixtures).
      fs: { allow: [repoDir] },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          fishing: fileURLToPath(new URL('./fishing.html', import.meta.url)),
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/online/**/*.test.ts'],
    },
  };
});
