import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      './3rdparty/Chessboard.js': '/test/js/__mocks__/cm-chessboard.js'
    }
  }
})
