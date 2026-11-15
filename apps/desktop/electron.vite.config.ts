import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: fileURLToPath(new URL('./electron/main/main.ts', import.meta.url)),
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
        external: ['better-sqlite3'],
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: fileURLToPath(new URL('./electron/preload/preload.ts', import.meta.url)),
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  renderer: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: './',
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: fileURLToPath(new URL('./index.html', import.meta.url)),
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 1420,
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  },
});