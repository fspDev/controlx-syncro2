import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/controlx-syncro2/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Control X Syncro',
        short_name: 'Control X',
        description: 'Gestión de proyectos, clientes y planillas gráficas — Control X',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/controlx-syncro2/',
        scope: '/controlx-syncro2/',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No cachear las imágenes base64 enormes de planillas en el SW —
        // esas viven en IndexedDB, no en archivos estáticos
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        // El bundle principal supera el límite default de Workbox (2 MiB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
