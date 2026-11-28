import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// SocialKit admin (../social-kit/admin) nằm ngoài admin nên react phải trỏ về node_modules của admin.
const socialKitAdmin = fileURLToPath(new URL('../social-kit/admin/src', import.meta.url));
const reactDir = fileURLToPath(new URL('./node_modules/react', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@social-kit-admin', replacement: socialKitAdmin },
      { find: /^react\/(.*)$/, replacement: `${reactDir}/$1` },
      { find: /^react$/, replacement: reactDir },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5174, strictPort: true, fs: { allow: ['..'] } },
  test: { environment: 'jsdom', globals: false, setupFiles: ['src/test-setup.ts'] },
});
