import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron' || process.env.ELECTRON === 'true';
  return {
    base: './',
    build: {
      outDir: isElectron ? 'dist-electron' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isElectron
          ? fileURLToPath(new URL('./electron/main/main.ts', import.meta.url))
          : fileURLToPath(new URL('./index.html', import.meta.url)),
        output: {
          entryFileNames: isElectron ? '[name].js' : 'assets/[name]-[hash].js',
          chunkFileNames: isElectron ? '[name].js' : 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            let extName = '';
            if (/\.css$/.test(assetInfo.name ?? '')) {
              extName = 'css';
            } else if (/\.(?:png|jpe?g|svg|gif|ttf|woff|woff2)$/.test(assetInfo.name ?? '')) {
              extName = 'assets/[ext]';
            }
            return `[name]-[hash].[${extName}]`;
          },
        },
      },
    },
    plugins: [react()],
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
  };
});