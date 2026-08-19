import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)', 'test/test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['flake-id-gen.js']
    }
  }
})
