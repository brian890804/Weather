import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.svg'],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
  },
})
