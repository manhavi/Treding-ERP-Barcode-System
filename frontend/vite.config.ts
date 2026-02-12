import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// Check if certificates exist
const certPath = path.resolve(__dirname, '../certs')
const keyPath = path.join(certPath, 'key.pem')
const certFilePath = path.join(certPath, 'cert.pem')
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certFilePath)

export default defineConfig({
  envDir: '..', // Load .env from project root (same as mobile)
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Aaradhya Fashion',
        short_name: 'AF Fashion',
        description: 'Lehenga Choli Business Management System',
        theme_color: '#1976d2',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    host: '127.0.0.1', // Use IPv4 explicitly to avoid permission issues
    port: 3000,
    strictPort: false,
    // Force HTTP (not HTTPS) for localhost
    https: false,
    hmr: {
      host: '127.0.0.1',
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url, '->', proxyReq.path);
          });
        },
      }
    }
  }
})
