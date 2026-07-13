import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          srcDir: 'public',
          filename: 'sw.js',
          injectManifest: true,
          workbox: {
            runtimeCaching: [
              {
                urlPattern: ({request}) => ['document','script','style'].includes(request.destination),
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources',
                  expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }
                }
              },
              {
                urlPattern: ({url}) => url.origin.includes('tiles'),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'map-tiles',
                  expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
