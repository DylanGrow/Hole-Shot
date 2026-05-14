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
      // Only include assets that actually exist in /public
      includeAssets: ['favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        // Precache all JS, CSS, HTML, and key image types
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
      manifest: {
        name: 'Hole Shot - Backyard Glory',
        short_name: 'Hole Shot',
        description: 'The ultimate backyard game scoring app with voice input, match history, and all-time player stats.',
        theme_color: '#f97316',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        // Must match the GitHub Pages base path exactly
        start_url: '/Hole-Shot/',
        scope: '/Hole-Shot/',
        lang: 'en',
        categories: ['sports', 'games'],
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
        ]
      }
    })
  ],
  base: '/Hole-Shot/',
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          db: ['dexie']
        }
      }
    }
  }
})
