import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // process.env をブラウザで安全に参照できるようにする
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
  }
});