import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Chỉ áp dụng cho code Fishing Online trong src/online.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
