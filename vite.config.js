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
        name: 'My Network',
        short_name: 'Network',
        description: 'Your personal network intelligence, on a map.',
        theme_color: '#aa3bff',
        background_color: '#16171d',
        display: 'standalone', // drops browser chrome so it feels like a native Android app
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
