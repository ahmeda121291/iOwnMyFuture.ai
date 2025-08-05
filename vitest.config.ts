import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts', './tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '@': path.resolve(__dirname, './app'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '@/core': path.resolve(__dirname, './app/core'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '@/features': path.resolve(__dirname, './app/features'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '@/shared': path.resolve(__dirname, './app/shared'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      '@/pages': path.resolve(__dirname, './app/pages'),
    },
  },
});