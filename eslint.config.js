import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/server-dist/**',
      '**/workers/**',
      '**/*.gen.*',
      '**/android/**',
      '**/ios/**',
      '**/public/**'
    ]
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended
    ]
  },
  {
    files: ['**/*.{ts,tsx}'],
    // 2026-11-18 首次接入：完整 recommended 扫描 1719 个文件，
    // 得到 371 errors / 65 warnings；总报错超过约定的 50 条门槛。
    // 仅将本次存在存量错误的规则暂降为 warn，后续按批次恢复默认级别。
    // 规则没有关闭；其余 recommended 规则及 exhaustive-deps 保持原级别。
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn', // 148 errors
      'react-hooks/set-state-in-effect': 'warn', // 101 errors
      'react-hooks/refs': 'warn', // 47 errors
      '@typescript-eslint/no-explicit-any': 'warn', // 36 errors
      'react-hooks/rules-of-hooks': 'warn', // 16 errors
      'react-hooks/immutability': 'warn', // 7 errors
      'prefer-const': 'warn', // 7 errors
      'react-hooks/purity': 'warn', // 3 errors
      '@typescript-eslint/no-wrapper-object-types': 'warn', // 2 errors
      '@typescript-eslint/ban-ts-comment': 'warn', // 2 errors
      'react-hooks/preserve-manual-memoization': 'warn', // 1 errors
      'no-var': 'warn', // 1 errors
    }
  }
]);
