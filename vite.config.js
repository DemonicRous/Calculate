import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/Calculate/',
  build: {
    rollupOptions: {
      output: {
        // Теперь manualChunks — это функция, которая проверяет путь к модулю
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three'; // Выносим Three.js в отдельный файл
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/@heroicons')) {
            return 'vendor'; // Vue и иконки в другой
          }
        }
      }
    }
  }
})