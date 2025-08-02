import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    // Enable source maps for debugging but optimize for production
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize build performance
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    // Optimize chunk splitting for better caching
    rollupOptions: {
      external: [
        // Node.js built-in modules
        'fs',
        'path',
        'os',
        'util',
        'crypto',
        'stream',
        'events',
        // Node.js specific dependencies
        'better-sqlite3',
        'bindings'
      ],
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: ['react', 'react-dom'],
          // Client-only services chunk
          services: [
            './src/services/logger.ts',
            './src/services/performance.ts',
            './src/services/errorHandler.ts'
          ],
          // Utils chunk (client-only)
          utils: [
            './src/services/csvImporter.ts'
          ]
        },
        // Optimize asset naming for caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit for better optimization
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'papaparse'
    ],
    exclude: [
      // Exclude Node.js specific modules from browser bundle
      'fs',
      'path',
      'os',
      'better-sqlite3'
    ]
  },
  // Configure path resolution
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },
  // Define environment variables for build optimization
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  }
})