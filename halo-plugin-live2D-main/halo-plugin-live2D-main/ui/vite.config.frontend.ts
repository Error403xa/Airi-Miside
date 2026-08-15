import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

// 前台 Live2D 脚本的独立构建配置
// 输出到 src/main/resources/static 目录，通过 ReverseProxy 暴露给前台
export default defineConfig({
  build: {
    outDir: '../src/main/resources/static',
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/frontend-live2d.js', import.meta.url)),
      name: 'Live2DFrontend',
      fileName: 'frontend-live2d',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
    },
  },
})
