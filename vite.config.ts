import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createDevApiMiddleware } from './server/devApiMiddleware';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        {
          name: 'therapist-search-dev-api',
          configureServer(server) {
            server.middlewares.use(createDevApiMiddleware());
          },
        },
        react(),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
