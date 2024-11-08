import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',  // Only needed if you're testing DOM stuff
    globals: true         // This allows you to use test/expect without importing
  }
})
