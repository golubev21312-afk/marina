import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// PocketBase (backend/pocketbase.exe serve) — база товаров и фото.
// В разработке сайт ходит к нему через прокси, как на хостинге: один адрес
const POCKETBASE = 'http://127.0.0.1:8090'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': POCKETBASE,
      '/_/': POCKETBASE,
    },
  },
})
