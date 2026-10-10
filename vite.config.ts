import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig(() => {
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      emptyOutDir: false,
    },
    server: {
      hmr: process.env.DISABLE_HMR === 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
