/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Served from https://bl4cktea.github.io/knockout-king/
export default defineConfig({
  base: '/knockout-king/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
