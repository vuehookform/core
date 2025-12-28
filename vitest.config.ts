import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rolldown-vite types incompatible with vitest's bundled vite
  plugins: [vue() as any],

  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['lib/**/*.test.ts'],
    setupFiles: ['./lib/__tests__/setup.ts'],
  },
})
