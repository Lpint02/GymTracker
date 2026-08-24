import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': reloading the page out from under someone
      // who is mid-set, to swap in a new build, is a bad trade. The app asks.
      registerType: 'prompt',
      // The manifest is a real file in public/ and is linked from index.html,
      // so the plugin must not generate a competing one.
      manifest: false,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        // Precaching the whole shell is what makes a cold start work with no
        // network at all. The build is small and fully static, and Workbox
        // revisions each entry, so there is no stale-asset problem.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Auth redirects carry ?code=... and must reach the real document
          // rather than being answered from the precache mid-flight.
          /^\/auth\//,
        ],
        // Supabase is deliberately absent from runtimeCaching. The IndexedDB
        // store IS the offline cache; a stale PostgREST response served from a
        // service worker would be actively harmful — it could resurrect deleted
        // workouts or hide ones that were just synced.
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Off in dev: a service worker caching the shell while the app is being
        // changed means debugging JavaScript that no longer exists. Test it
        // with `npm run build && npm run preview`.
        enabled: false,
      },
    }),
  ],
})
