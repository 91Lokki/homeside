import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Local dev: proxy /api to `vercel dev` (port 3000) so the serverless
    // functions in /api work the same locally as in production. Run both with:
    //   vercel dev      (serves /api on :3000)
    //   npm run dev     (serves the Vite app, proxying /api -> :3000)
    // If you are not running `vercel dev`, the app falls back to seed data.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
