import { defineConfig, coverageConfigDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
	...coverageConfigDefaults.exclude,
        'node_modules/**',
        'sandbox/**',
        'test/**',
        '**/*.d.ts',
        '**/vendor/**',
        '**/3rdparty/**',
      ],
      statements: 85,
      branches: 90,
      functions: 85,
      lines: 85
    }
  },
  resolve: {
    alias: {
      './3rdparty/Chessboard.js': '/test/js/__mocks__/cm-chessboard.js'
    }
  }
})
