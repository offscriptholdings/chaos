import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    { name: 'compat-setups', enforce: 'pre', transform: (c, id) => /\/src\/data\.js$/.test(id) ? c + '\nexport const SETUPS = {};' : null },
  ],
  base: '/',
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
});
