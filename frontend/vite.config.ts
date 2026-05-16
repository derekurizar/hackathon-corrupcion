import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Isolated standalone SPA. No file:../backend dep by design.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    outDir: 'dist',
  },
});
