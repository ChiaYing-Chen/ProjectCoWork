import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // 設定為您的 GitHub 儲存庫名稱
  base: '/ProjectCoWork/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '專案管理工具',
        short_name: '專案管理',
        description: '透過月曆與甘特圖方式管理專案',
        theme_color: '#ffffff',
        background_color: '#f1f5f9',
        display: 'standalone',
        scope: '/ProjectCoWork/',
        start_url: '/ProjectCoWork/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  publicDir: 'public',
  build: {
    // 將輸出目錄設定為 'docs' 以便 GitHub Pages 從 main 分支部署
    outDir: 'docs',
  },
})