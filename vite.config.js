import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build tuning:
// - Split vendor libraries into separate chunks for optimal caching
// - Enable source maps for production debugging (Sentry integration)
// - Optimize asset handling for CDN delivery
export default defineConfig({
  plugins: [react()],
  
  // Server configuration for development
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Raise slightly so you don't get noise for a single heavy feature page
    chunkSizeWarningLimit: 800,
    
    // Generate source maps for production error tracking (Sentry)
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
    
    // Minification (esbuild is default and fastest - no extra dependency needed)
    minify: 'esbuild',
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    
    rollupOptions: {
      output: {
        // Content-hash based filenames for long-term caching
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (/css/i.test(ext)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React core (rarely changes)
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }

          // Charts (heavy, lazy-loaded)
          if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
            return 'charts';
          }

          // Animations (can be deferred)
          if (id.includes('framer-motion')) {
            return 'motion';
          }

          // i18n (loaded on demand)
          if (id.includes('i18next')) {
            return 'i18n';
          }

          // Utility libraries
          if (id.includes('zod') || id.includes('lucide-react')) {
            return 'utils';
          }

          // Everything else
          return 'vendor';
        }
      }
    }
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
});
