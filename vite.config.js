import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build tuning:
// - Split vendor libraries into separate chunks so Render/Vite doesn't ship one huge JS file.
// - Keep defaults sane; this is only to reduce the "...larger than 500 kB" warning.
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise slightly so you don't get noise for a single heavy feature page.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React + router
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }

          // Charts can be heavy
          if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
            return 'charts';
          }

          // Animations
          if (id.includes('framer-motion')) {
            return 'motion';
          }

          // Everything else
          return 'vendor';
        }
      }
    }
  }
});
