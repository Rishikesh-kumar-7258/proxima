import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 — drives styling straight from the Vite pipeline, no config file
    VitePWA({
      registerType: 'autoUpdate', // service worker refreshes itself silently on each deploy
      manifest: {
        name: 'Proxima',
        short_name: 'Proxima',
        description: 'Your personal network intelligence, on a map.',
        theme_color: '#7c3aed',
        background_color: '#16171d',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
