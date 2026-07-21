import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (['ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'EPIPE'].includes(err.code)) return;
            console.error('API proxy error', err);
          });
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (['ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'EPIPE'].includes(err.code)) return;
            console.error('proxy error', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            socket.on('error', (err) => {
              if (['ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'EPIPE'].includes(err.code)) return;
              console.error('proxy socket error', err);
            });
          });
        }
      }
    }
  }
})
