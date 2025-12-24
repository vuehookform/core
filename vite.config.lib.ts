import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/lib/**/*'],
      exclude: ['src/lib/**/__tests__/**/*'],
      outDir: 'dist',
      tsconfigPath: './tsconfig.lib.json',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
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
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
})
