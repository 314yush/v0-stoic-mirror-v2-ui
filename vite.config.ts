import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get the directory where vite.config.ts is located (project root)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envDirPath = resolve(__dirname)

// Debug: Log where we're looking for .env (only in dev mode)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Vite envDir:', envDirPath)
  console.log('🔍 Looking for .env at:', resolve(envDirPath, '.env'))
}

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src/renderer',
  // Explicitly tell Vite to look for .env in the project root (where vite.config.ts is)
  // This is needed because root is set to 'src/renderer', but .env is in project root
  // Using absolute path to ensure it's found regardless of where Vite runs from
  envDir: envDirPath,
  plugins: [react()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600, // Increase limit slightly for Electron apps
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        manualChunks: {
          // Split vendor chunks for better caching and loading
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'zustand-vendor': ['zustand'],
        },
      },
    },
  },
  base: './', // Important for Electron - use relative paths
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
})



