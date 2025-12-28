import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['lib/**/*'],
      exclude: ['lib/**/__tests__/**/*'],
      outDir: 'dist',
      tsconfigPath: './tsconfig.lib.json',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./lib', import.meta.url)),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'VueHookForm',
      fileName: 'vuehookform',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', 'zod'],
      output: {
        globals: {
          vue: 'Vue',
          zod: 'Zod',
        },
      },
    },
    sourcemap: false,
    minify: false,
    emptyOutDir: true,
  },
})
