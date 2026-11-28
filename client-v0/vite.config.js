import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const repoDir = fileURLToPath(new URL('..', import.meta.url));
const fixturesDir = fileURLToPath(new URL('../docs/v01/fixtures', import.meta.url));
// SocialKit (../social-kit/client): module dùng lại được; file của kit nằm ngoài client-v0 nên firebase phải trỏ về node_modules của game.
const socialKitDir = fileURLToPath(new URL('../social-kit/client/src', import.meta.url));
const firebaseDir = fileURLToPath(new URL('./node_modules/firebase', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, 'VITE_');
  // Fishing Online (fishing.html): không có file .env thì dev chạy mock, build dùng Server thật.
  const useMock = env.VITE_USE_MOCK ?? (mode === 'production' ? 'false' : 'true');

  return {
    define: {
      'import.meta.env.VITE_USE_MOCK': JSON.stringify(useMock),
    },
    resolve: {
      alias: [
        { find: '@fixtures', replacement: fixturesDir },
        { find: '@social-kit', replacement: socialKitDir },
        { find: /^firebase\/(.*)$/, replacement: `${firebaseDir}/$1` },
      ],
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
          pier: fileURLToPath(new URL('./pier.html', import.meta.url)),
          cabin: fileURLToPath(new URL('./cabin.html', import.meta.url)),
        },
      },
    },
    test: {
      environment: 'node',
      // dir '..' để vitest đọc cả test của SocialKit (ngoài client-v0).
      dir: '..',
      include: ['client-v0/src/online/**/*.test.ts', 'social-kit/client/src/**/*.test.ts'],
      // Test của kit nằm ngoài root; cho vitest đọc.
      dir: '..',
    },
  };
});
