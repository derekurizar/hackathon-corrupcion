import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Isolated standalone SPA. No file:../backend dep by design.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: { '@': '/src' },
    // React Flow (ConcentrationFan) is not auto-discovered by Vite's dep
    // scanner because it is behind a `lazy()` import; without deduping it
    // pulls a second React copy → "Invalid hook call". Pin a single React.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle React Flow so it shares the app's optimized React instance.
    include: ['reactflow'],
  },
  build: {
    outDir: 'dist',
  },
});
