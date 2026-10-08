import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Simgeler, logolar ve yazı tipleri aşağıdaki desenle önbelleğe alınır (varsayılan yalnızca js/css/html).
      // Aynı dosyalar ayrıca listelenirse servis çalışanında çift girdi olur; bu yüzden includeAssets ve manifest simgeleri yok.
      includeManifestIcons: false,
      workbox: {
        // Bildirimleri gösteren kod (public/push-handler.js) servis çalışanına eklenir
        importScripts: ['push-handler.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        id: '/',
        name: 'Monthwise',
        short_name: 'Monthwise',
        description: 'Abonelik ve kredi kartı ödemelerinin takibi',
        lang: 'tr',
        // iPhone sayfa çizilene kadar ekranı bu renkle boyuyor olabilir: koyu gri (#141414) açılışta 2 karelik gri çakma yapıyordu
        // (2026-10-07 ekran kaydında ölçüldü). Koyu temadaki açılış ekranıyla aynı siyah.
        theme_color: '#000000',
        background_color: '#F1ECE2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
