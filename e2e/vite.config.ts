import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Ensure library resolves to built dist
      '@vuehookform/core': fileURLToPath(new URL('../dist/vuehookform.js', import.meta.url)),
    },
    dedupe: ['vue', 'zod'],
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})
