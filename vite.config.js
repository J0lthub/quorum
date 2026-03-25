import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // environment defaults to 'node' — sufficient for pure utility tests; add environment: 'happy-dom' if component tests are needed
  test: { globals: true },
})
