import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Chemins relatifs : le site fonctionne sous https://<utilisateur>.github.io/<depot>/
  // quel que soit le nom du dépôt.
  base: './',
  plugins: [react()],
  server: { open: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Three.js dans son propre chunk : meilleur cache navigateur
        manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei'] },
      },
    },
  },
})
