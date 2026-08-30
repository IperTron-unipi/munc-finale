import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React e Firestore cambiano solo quando aggiorno le dipendenze:
        // tenerli in chunk propri li lascia in cache tra un deploy e l'altro.
        codeSplitting: {
          groups: [
            { name: 'firebase-firestore', test: /node_modules\/@firebase\/firestore/ },
            { name: 'firebase-core', test: /node_modules\/(@firebase|firebase)\// },
            { name: 'react', test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\// },
          ],
        },
      },
    },
  },
})
