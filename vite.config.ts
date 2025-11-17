import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    visualizer({ filename: 'stats/bundle-stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
  ],
  base: './',
  server: { port: 5173 },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        },
      },
      treeshake: true,
    },
    target: 'es2020',
  },
  esbuild: { drop: ['console', 'debugger'] },
});