import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { createSearchMiddleware } from './src/server/searchMiddleware.ts';
import { createContentFetchMiddleware } from './src/server/contentFetchMiddleware.ts';

process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
dotenv.config();

const dirname = import.meta.dirname || path.resolve('.');

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'echotrace-api-services',
        configureServer(server) {
          server.middlewares.use('/api/search', createSearchMiddleware());
          server.middlewares.use('/api/fetch', createContentFetchMiddleware());
        },
      },
    ],
    resolve: {
      alias: {
        '@': dirname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
