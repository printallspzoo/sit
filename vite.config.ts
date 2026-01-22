
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Sitrem Employee Portal',
          short_name: 'Sitrem',
          description: 'Employee time tracking and reporting portal',
          theme_color: '#ffffff',
          background_color: '#f3f4f6',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'icon.svg',
              sizes: '64x64 32x32 24x24 16x16 192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist', // Ensure this matches Render 'Publish Directory'
      sourcemap: false,
      chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce noise
      rollupOptions: {
        output: {
          // Manual chunk splitting to fix large bundle warning
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react', 'react-qr-code'],
            'vendor-utils': ['jsqr', '@zxing/library'],
            'vendor-core': ['@supabase/supabase-js', '@google/genai'],
          }
        }
      }
    }
  };
});
