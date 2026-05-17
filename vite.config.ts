import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        // Don't cache external resources
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
      manifest: {
        name: 'Hole Shot — Cornhole Scorer',
        short_name: 'Hole Shot',
        description: 'Free cornhole scoring app with voice announcer, skunk detection, match history, and offline support.',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Hole-Shot/',
        scope: '/Hole-Shot/',
        lang: 'en',
        categories: ['sports', 'games', 'utilities'],
        icons: [
          {
            src: '/Hole-Shot/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/Hole-Shot/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/Hole-Shot/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'New Game',
            short_name: 'New',
            url: '/Hole-Shot/',
            description: 'Start a new cornhole match'
          }
        ]
      }
    })
  ],
  base: '/Hole-Shot/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          db: ['dexie']
        }
      }
    }
  }
})
