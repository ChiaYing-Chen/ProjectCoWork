import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 設定為您的 GitHub 儲存庫名稱
  base: '/ProjectCoWork/',
  plugins: [react()],
  build: {
    // 將輸出目錄設定為 'docs' 以便 GitHub Pages 從 main 分支部署
    outDir: 'docs',
  },
})