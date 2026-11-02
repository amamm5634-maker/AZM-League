import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build for Cloudflare Pages: output goes to `dist/`.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
});
